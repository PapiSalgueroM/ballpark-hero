import type { GameContentMap } from './types';

// Pro basketball game guides. Casual human tone, no em dashes anywhere.
export const BASKETBALL_CONTENT: GameContentMap = {
  '/buzzer-beater': {
    intro: [
      "Most of this site asks you a question. This one asks you to make the shot. Ten jump shots, you back up on every single one, and there is a hand coming at you on nine of them.",
      "The whole game is the arc. A basket is a hole you drop the ball into from above, so how steeply the ball arrives decides how much room it has. Come in flat and there is almost nothing to go through. Come in steep and there is room, but you have to throw it harder to get there, and a hard release goes where it wants rather than where you pointed it.",
    ],
    headings: {
      howToPlay: "How to play Buzzer Beater, a free NBA jump shot arcade game",
      rules: "Buzzer Beater rules for the arc, the bar and the hand",
      example: "Buzzer Beater walkthrough: a free throw and a contested shot",
      tips: "Buzzer Beater tips for arc, fade and release strength",
      faq: "Buzzer Beater FAQ: daily shots, controls and the physics",
    },
    howToPlaySections: [
      {
        heading: "Dialing in the shot arc",
        items: [
          "Set the arc with the up and down arrows, or by dragging up and down on the court. The readout shows the angle you are shooting at.",
        ],
      },
      {
        heading: "Fading off the defender's hand",
        items: [
          "Fade off the closeout with left and right. The ring in the corner shows where you are pointing across the hoop.",
        ],
      },
      {
        heading: "Charging the release before you let go",
        items: [
          "Hold space, or hold the shoot button, to load the strength bar, and let go. The bar sweeps up and down and you get the number you release on.",
        ],
      },
      {
        heading: "Ten shots with the hand climbing higher",
        items: [
          "Ten shots a run, from the free throw line out past the arc, with a higher hand in your face every time.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The ring, the ball and the shrinking window",
        items: [
          "The ring is 18 inches across on the inside and the ball is a little under 9 and a half, which is the real difference and the reason arc matters. Seen along your shot the ring keeps its width but loses its depth, so the room you have to be short or long shrinks as the shot flattens and runs out entirely near 32 degrees.",
        ],
      },
      {
        heading: "The strength bar has no single sweet spot",
        items: [
          "The strength bar is absolute, not a percentage of what this shot needs. The right place to stop it is different from the free throw line than it is from the arc, so there is no single spot that works all night.",
        ],
        subsections: [
          {
            heading: "Why a hard release sprays the shot",
            items: [
              "A hard release sprays. It costs you accuracy side to side and a little pace either way, and the cost grows faster than the strength does, so the top of the bar is where the misses live.",
            ],
          },
        ],
      },
      {
        heading: "Going over the hand or fading around it",
        items: [
          "The hand only blocks what stays low. Go over it, or fade off it, and either way you have given something up to do it.",
        ],
      },
      {
        heading: "How each basket gets scored",
        items: [
          "Baskets pay by distance, by the hand you shot over and by how cleanly the ball went through. A free throw pays least.",
        ],
      },
      {
        heading: "Daily shots versus unlimited practice",
        items: [
          "The daily deals the same ten shots to everyone and keeps your score for the day. Unlimited deals fresh ones for ever.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A free throw with nobody in your face",
        paragraphs: [
          "Shot one is a free throw with nobody near you. It only needs a gentle release, so a big arc costs you nothing: put it up around 60 degrees, stop the bar low, and the ball comes down almost on top of the ring with plenty of room.",
        ],
      },
      {
        heading: "A far shot with a hand closing in",
        paragraphs: [
          "Shot ten is 8.6 metres out with a hand reaching over three metres, closing to within a metre of you. That same 60 degree arc now has to be thrown hard enough to spray, so flatten it a little, clear the hand by the smallest margin you dare, and accept that this one is close to a coin flip. It is also worth about three times what the free throw paid.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Go high from close, flatten out further back",
        items: [
          "High from close, flatter as you back up. It is the opposite of what feels right, and it is the single biggest thing to learn here.",
        ],
      },
      {
        heading: "Trust the dashed line and the angle readout",
        items: [
          "Read the dashed line before you load the bar. It shows the shape this release would take with nothing going wrong, so if it is already passing under the ring, fix the arc rather than hoping.",
          "The angle readout after every shot is the honest feedback. Anything under about 40 degrees was never going in, however well you aimed it.",
        ],
      },
      {
        heading: "Fading only when you truly have to",
        items: [
          "Fading is expensive. Only fade when the hand is genuinely too high to go over, because every centimetre of fade is a centimetre off the middle of the ring.",
        ],
      },
    ],
    faqs: [
      { q: 'Is the daily the same for everyone?', a: 'Yes. The ten shots come from the date, so every player gets the same run, and your score is kept for the day.' },
      { q: 'Do I need a keyboard?', a: 'No. Drag the court to set the arc and the fade, then let go to shoot, which works the same on a phone.' },
      { q: 'Why did a shot that looked perfect rattle out?', a: 'Almost always the angle. Check the entry number on the result: a flat shot is aiming at a slot rather than a hole, and there is barely a centimetre in it.' },
      { q: 'Is the physics real?', a: 'The flight and the rim geometry are, and so are the rim, ball and release heights. The tolerances are widened on purpose, because nobody hits a centimetre with a sweeping bar and a thumb.' },
    ],
  },
  '/perfect-season-nba': {
    intro: [
      "The wheel owns your draft board. Every spin stops on a real NBA team season, 1950s to today, and you take exactly one player from that roster.",
      "Six picks build a cross era starting five plus a sixth man, then the simulator plays all 82 games. The goal is right there in the name: 82-0.",
    ],
    headings: {
      howToPlay: "How to play 82-0 Perfect Season, a free online NBA draft simulator",
      rules: "82-0 Perfect Season rules: spins, rerolls and the simulated playoffs",
      example: "82-0 Perfect Season walkthrough: a Lakers spin and a playoff run",
      tips: "82-0 Perfect Season tips for drafting a title worthy roster",
      faq: "82-0 Perfect Season FAQ: daily mode, ratings and going undefeated",
    },
    howToPlaySections: [
      {
        heading: "Choosing Classic, Hard or Daily mode",
        items: [
          "Choose a mode. Classic shows player ratings, Hard hides them until the sim ends, and Daily gives everyone the same wheel with one attempt per day.",
        ],
      },
      {
        heading: "Drafting one player per spin",
        items: [
          "Spin, then draft one player from the team season you land on. Ratings run 40 to 99 and come from the player's actual stats that year.",
        ],
      },
      {
        heading: "Filling six roster slots",
        items: [
          "Repeat until all six slots are filled: PG, SG, SF, PF, C and a sixth man who can be anyone.",
        ],
      },
      {
        heading: "Playing out the season or skipping ahead",
        items: [
          "Watch the season play out, or skip straight to the final record.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Spin limits and no repeat picks",
        items: [
          "One player per spin, 2 rerolls per run, and no player can be drafted twice.",
        ],
      },
      {
        heading: "How the season plays out",
        items: [
          "The sim plays a full 82 game season based on your team overall.",
        ],
        subsections: [
          {
            heading: "Reaching the simulated playoffs",
            items: [
              "Win 55 games or more to reach the simulated playoffs.",
            ],
          },
        ],
      },
      {
        heading: "Daily mode's single attempt",
        items: [
          "Daily mode locks after one attempt and resets every day at midnight Eastern.",
        ],
      },
      {
        heading: "Decade Mode versus the full wheel",
        items: [
          "Decade Mode limits every spin to one era. Daily always uses the full wheel.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A first spin on a classic Lakers season",
        paragraphs: [
          "Your first spin lands on the 1986-87 Lakers, so you take the best guard available. Four spins later your overall sits at 88.",
        ],
      },
      {
        heading: "A hot start that stalls in the Conference Finals",
        paragraphs: [
          "The sim opens 21-0, then drops three random games. You finish 76-6, sweep the First Round, and fall in the Conference Finals. Close only makes it worse.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Sixth man rating carries less weight",
        items: [
          "The sixth man slot counts slightly less toward your overall, so park your weakest pick there.",
        ],
      },
      {
        heading: "Ratings reward one big season, not a career",
        items: [
          "Ratings reflect single seasons, not careers. One giant year can outrate a legend's farewell season.",
        ],
      },
      {
        heading: "What an 85 overall team usually wins",
        items: [
          "An 85 overall team averages around 58 wins. A real shot at perfection starts in the mid 90s.",
        ],
      },
    ],
    faqs: [
      { q: "Is 82-0 actually possible?", a: "Yes, but barely. Even a 99 overall lineup averages about 80 wins, so you need a monster draft and a lucky sim on the same run." },
      { q: "Where do the ratings come from?", a: "Ratings come from the player's real points, rebounds and assists per 36 minutes that season, adjusted slightly for the era's pace." },
      { q: "What happens after the regular season?", a: "55 wins or more triggers a simulated bracket, four best of 7 rounds through the NBA Finals, with a Finals MVP from your roster if you win it all." },
    ],
  },

  '/stat-detective': {
    intro: [
      "Somewhere in the NBA record books there is a season with the name scrubbed off. You get the decade, the position and the per 36 minute stat line. That is the whole case file.",
      "Name the player within 8 guesses. Clues drip out as you miss, and the pool runs from all time greats to guys only real heads remember.",
    ],
    headings: {
      howToPlay: "How to play Stat Detective, an NBA player guessing game",
      rules: "Stat Detective rules for clues, guesses and the case file",
      example: "Stat Detective walkthrough: cracking a case with two clues",
      tips: "Stat Detective tips for reading stat lines like a detective",
      faq: "Stat Detective FAQ: difficulty, clues and how cases repeat",
    },
    howToPlaySections: [
      {
        heading: "Choosing Stars or Deep Cuts difficulty",
        items: [
          "Pick a difficulty. Stars is famous seasons rated 85 or higher, Deep Cuts covers starters and cult heroes rated 60 to 84.",
        ],
      },
      {
        heading: "Reading the case file's stat line",
        items: [
          "Read the case file: era, position, minutes played, and points, rebounds and assists per 36 minutes.",
        ],
      },
      {
        heading: "Typing a name and picking a suspect",
        items: [
          "Type 2 or more letters and pick a player from the suggestions.",
        ],
        subsections: [
          {
            heading: "How each miss unlocks a new clue",
            items: [
              "Each miss unlocks a new clue, starting with the player's career span.",
            ],
          },
        ],
      },
      {
        heading: "Closing the case within eight guesses",
        items: [
          "Name the player within 8 guesses to close the case.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Eight guesses to crack the case",
        items: [
          "You get 8 guesses per case.",
        ],
      },
      {
        heading: "What a wrong guess still tells you",
        items: [
          "Wrong guesses show whether your guess ever played for the mystery player's franchise.",
        ],
      },
      {
        heading: "The clue order from miss to miss",
        items: [
          "Clues unlock after every miss: career span, surname initial, franchise count, team, first initial, then the exact season after miss 6.",
        ],
      },
      {
        heading: "When steals and blocks start showing up",
        items: [
          "Steals and blocks only appear on cases from 1973-74 onward, because the league did not track them before that.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A first guess and the shared franchise chip",
        paragraphs: [
          "The file says 1980s, point guard, 11 assists per 36. Your first guess misses, but the chip says shared franchise, so those two wore the same uniform at some point.",
        ],
      },
      {
        heading: "Narrowing it down with the career span clue",
        paragraphs: [
          "Then the career span clue narrows the field to one generation of playmakers. With the franchise hint on top, guess three closes the case.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Doing the era math before you guess",
        items: [
          "Do the era math first. A career span ending in 1991 rules out half your instincts.",
        ],
      },
      {
        heading: "Trusting the franchise chip across relocations",
        items: [
          "The franchise chip is quiet gold. Relocations count as the same franchise, so a Sonics guess can match a Thunder mystery.",
        ],
      },
      {
        heading: "Watching for pace inflated rebound numbers",
        items: [
          "Big rebound numbers from the 1960s are inflated by pace. Do not assume only legends grabbed 15 boards.",
        ],
      },
    ],
    faqs: [
      { q: "Why per 36 minutes instead of per game?", a: "The underlying season data stores totals and minutes, so per 36 rates are the honest version. They also make eras comparable, since a bench player's rate line reads the same as a starter's." },
      { q: "How many cases are there?", a: "Thousands. Every qualifying season from 1951-52 to today is a case candidate, split into Stars and Deep Cuts by season rating." },
      { q: "Does it repeat cases?", a: "Cases draw at random, and the game never serves the same case twice in a row." },
    ],
  },

  '/nba-stat-line': {
    intro: [
      "Someone in NBA history put up this exact line. Your job is to rebuild it from parts: a target of points, rebounds and assists per 36 minutes, a shooting split, and in the modern eras steals and blocks too.",
      "You get five real player seasons, any five you can dig out of the record books. Their combined line is minutes weighted, so a 3,000 minute monster season pulls your blend way harder than a 600 minute cameo.",
    ],
    headings: {
      howToPlay: "How to play NBA Stat Line, a daily basketball stat blending game",
      rules: "NBA Stat Line rules for seasons, minutes and the shooting split",
      example: "NBA Stat Line walkthrough: blending a high usage wing's target",
      tips: "NBA Stat Line tips for leverage, archetypes and shooting splits",
      faq: "NBA Stat Line FAQ: modes, minutes and eligible seasons",
    },
    howToPlaySections: [
      {
        heading: "Daily target or Unlimited practice",
        items: [
          "Pick a mode. Daily gives everyone the same target with one scored run per day, Unlimited deals a fresh target every time.",
        ],
      },
      {
        heading: "Reading FG%, FT% or 3P% in the target",
        items: [
          "Read the target line. Every number is per 36 minutes, and the shooting split might be FG%, FT% or 3P% depending on the target.",
        ],
      },
      {
        heading: "Searching real players and picking a season",
        items: [
          "Search any NBA player and pick one of their real seasons. Each pick shows its own per 36 line so you can see what it adds.",
        ],
      },
      {
        heading: "Watching your combined line update live",
        items: [
          "Watch your combined line update as you go. It is the minutes weighted blend of your five picks.",
        ],
      },
      {
        heading: "Submitting all five slots for a score",
        items: [
          "Fill all five slots, then submit for a similarity score out of 100.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Five seasons, none repeated",
        items: [
          "Exactly five seasons per run, no season picked twice.",
        ],
      },
      {
        heading: "What counts as a qualifying season",
        items: [
          "Only seasons with 500 or more minutes qualify, and combined traded rows do not appear, every pick is a real single team season.",
        ],
      },
      {
        heading: "Older eras and stats the league never tracked",
        items: [
          "When the target includes steals or blocks, only seasons from 1973-74 on can be picked, because the league did not track those stats before then. A 3P% target limits picks to 1979-80 on for the same reason.",
        ],
      },
      {
        heading: "How the shooting split and final score are built",
        items: [
          "The combined shooting split is recalculated from total makes and attempts across your five picks, never by averaging the five percentages.",
        ],
        subsections: [
          {
            heading: "What ninety or better means",
            items: [
              "Each stat scores by how close you land, and the final score is the average across all target stats. 90 or better counts as nailing the line.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Chasing a high usage wing's target line",
        paragraphs: [
          "The target reads 24.1 points, 6.0 rebounds, 4.5 assists, 1.3 steals, 0.4 blocks and 48.2 FG% per 36. That smells like a high usage wing, so you grab two scoring guards from the 1990s.",
        ],
      },
      {
        heading: "Rounding out the blend to land a 91",
        paragraphs: [
          "Your blend sits at 27 points and only 4 rebounds, too hot and too thin on the glass. You round it out with a glue forward and two mid usage seasons, submit at 24.8 and 5.7, and land a 91.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Using minutes as leverage on the blend",
        items: [
          "Minutes are leverage. If your line is close, add low minute seasons so the blend barely moves; if it is way off, a heavy minute season drags it fastest.",
        ],
      },
      {
        heading: "Thinking in scorer, rebounder and connector archetypes",
        items: [
          "Do not chase one stat at a time. Every pick moves all six numbers, so think in archetypes: scorers, rebounders, connectors.",
        ],
      },
      {
        heading: "Old big man seasons as rebound rocket fuel",
        items: [
          "Old big man seasons are rebound rocket fuel, 1960s pace inflated boards for everyone. One pick from that era can fix a rebound deficit on its own.",
        ],
      },
      {
        heading: "Why attempts drive your final percentage",
        items: [
          "The shooting split blends by attempts, not evenly. A high volume shooter moves your percentage much more than a low volume one at the same clip.",
        ],
      },
    ],
    faqs: [
      { q: "Why per 36 minutes instead of per game?", a: "Per game averages need games played, and the historical season data here stores totals and minutes without game counts. Per 36 rates are exact from what the record does carry, and they make a 1965 season and a 2025 season readable on the same scale." },
      { q: "Is a perfect 100 possible?", a: "Every target is the real per 36 line of an actual season, so a blend that lands the target exists in the pool. Hitting 100 on the nose means matching every stat almost exactly, which is brutally hard with five picks, 90 plus is the realistic brag." },
      { q: "Why can I not pick 1960s seasons on some targets?", a: "Steals and blocks were first tracked in 1973-74 and the three point line arrived in 1979-80. When the target includes those stats, earlier seasons have no honest number to contribute, so they sit out. Targets without them open the whole pool back to 1951-52." },
      { q: "Do steals and blocks always appear?", a: "Only when the season behind the target comes from 1973-74 or later. Older targets score on points, rebounds, assists and the shooting split alone." },
    ],
  },

  '/nba-starting-5': {
    intro: [
      "One spin sets the mission: build a starting five with the highest career scoring, or the lowest, or whatever the stat wheel demands.",
      "The catch: each of your five picks must come from a random NBA franchise, so your plan is only as good as your memory of who played where.",
    ],
    headings: {
      howToPlay: "How to play NBA Starting 5, a franchise lineup guessing game",
      rules: "NBA Starting 5 rules for slots, teams and rerolls",
      example: "NBA Starting 5 walkthrough: an easy pick and two rude ones",
      tips: "NBA Starting 5 tips for journeymen and reading the challenge",
      faq: "NBA Starting 5 FAQ: player pool, positions and verdicts",
    },
    howToPlaySections: [
      {
        heading: "Spinning the stat challenge",
        items: [
          "Spin the stat challenge. It might be highest career PPG, lowest career fouls, most championships, tallest lineup, anything from a pool of 13 stats.",
        ],
      },
      {
        heading: "Choosing a position to fill",
        items: [
          "Pick one of the five positions: PG, SG, SF, PF or C.",
        ],
      },
      {
        heading: "Naming a player from the random team",
        items: [
          "A random NBA team appears. Name a player who suited up for that franchise, picking from the suggestions as you type.",
        ],
      },
      {
        heading: "Filling all five slots and tracking your total",
        items: [
          "Repeat until all five slots are filled, watching your running stat total.",
        ],
      },
      {
        heading: "Submitting the lineup for a verdict",
        items: [
          "Submit the lineup for a verdict: a rating, a headline and a short breakdown.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Five slots drawn from thirty franchises",
        items: [
          "Five slots, one random team per pick, drawn from all 30 NBA franchises.",
        ],
      },
      {
        heading: "Suggestions only show real former players",
        items: [
          "Only players who really played for the shown team will appear in the suggestions.",
        ],
        subsections: [
          {
            heading: "How guards, forwards and centers slot in",
            items: [
              "Guards fill PG or SG, forwards fill SF or PF, centers fill C.",
            ],
          },
        ],
      },
      {
        heading: "No repeating a player in one lineup",
        items: [
          "No player can appear twice in one lineup.",
        ],
      },
      {
        heading: "Rerolling a team as often as you like",
        items: [
          "Hit reroll to swap the current team, as often as you like.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "An easy call at shooting guard",
        paragraphs: [
          "The wheel says highest career PPG. Your first slot is SG from the Bulls, and you do not overthink Michael Jordan.",
        ],
      },
      {
        heading: "Two tougher franchises and a rough verdict",
        paragraphs: [
          "Then it gets rude: PF from the Grizzlies, C from the Hornets. You dig up the best scorers you can remember, submit a total in the high 90s, and the verdict roasts your weakest link.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reading the challenge direction twice",
        items: [
          "Read the direction twice. On a lowest challenge, the stars you love are suddenly poison.",
        ],
      },
      {
        heading: "Journeymen as a five team cheat code",
        items: [
          "Journeymen are cheat codes. A player with five career stops gives you outs on five different team spins.",
        ],
      },
      {
        heading: "Rerolling early instead of late",
        items: [
          "Reroll early, not late. A bad team fit hurts more when only one slot is left.",
        ],
      },
    ],
    faqs: [
      { q: "Do the players have to be current?", a: "No. The pool spans thousands of players across NBA history, as long as they played for the shown franchise." },
      { q: "Why will the game not accept my guy at point guard?", a: "Position data is coarse: guards fit either guard slot, forwards fit either forward slot, and centers fit center. If a player is listed as a forward, he cannot fill your PG hole." },
      { q: "How is my lineup judged?", a: "Each pick gets a value for the challenge stat, then the game writes a short verdict with a rating and headline you can share." },
    ],
  },

  '/nba-connect-4': {
    intro: [
      "Connect 4 with receipts. The board is the classic 7 wide by 6 tall grid, but you cannot just drop a piece. You have to earn the cell with an NBA answer.",
      "Every column and row carries a label, things like Lakers, MVP Winner or 20+ PPG Career. To claim a cell, you need one player who matches both.",
    ],
    headings: {
      howToPlay: "How to play NBA Connect 4, a two player basketball trivia game",
      rules: "NBA Connect 4 rules for the grid, names and rejected answers",
      example: "NBA Connect 4 walkthrough: a Warriors clear and a Lakers block",
      tips: "NBA Connect 4 tips for reading rows and burning answers early",
      faq: "NBA Connect 4 FAQ: solo play, wrong calls and board variety",
    },
    howToPlaySections: [
      {
        heading: "Grabbing a friend for two player play",
        items: [
          "Grab a friend. It is a two player game, red against blue, on one screen.",
        ],
      },
      {
        heading: "Picking a column and watching the piece fall",
        items: [
          "On your turn, pick a column. Your piece will fall to the lowest empty row.",
        ],
        subsections: [
          {
            heading: "Committing to the column's and row's labels",
            items: [
              "That landing spot commits you to two labels: the column's and the row's.",
            ],
          },
        ],
      },
      {
        heading: "Naming a player and passing the fact check",
        items: [
          "Name an NBA player who fits both. A fact check reviews the claim before the piece is placed.",
        ],
      },
      {
        heading: "Winning with four in a row",
        items: [
          "First to four in a row wins: across, down or diagonal.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "A seven by six grid of trivia labels",
        items: [
          "The grid is 7 columns by 6 rows, each with its own trivia label.",
        ],
      },
      {
        heading: "Each player name usable once by either side",
        items: [
          "Each player name can only be used once per game, by either side.",
        ],
      },
      {
        heading: "What a rejected answer costs you",
        items: [
          "A rejected answer does not place a piece and does not end your turn. Try someone else or hit skip.",
        ],
      },
      {
        heading: "Filling all forty two cells with no winner",
        items: [
          "Fill all 42 cells with no winner and it is a draw.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Clearing the Warriors and Champion crossing",
        paragraphs: [
          "You drop into the Warriors column and the landing row says Champion. Andre Iguodala fits both, the check clears it, and your red piece locks in.",
        ],
      },
      {
        heading: "Blue blanks on Lakers and DPOY Winner",
        paragraphs: [
          "Later, blue needs the Lakers column to block you, but the waiting row says DPOY Winner and they blank. They skip, you finish the diagonal.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Thinking one row ahead as columns fill",
        items: [
          "Think one row ahead. The label your piece lands on changes as the column fills.",
        ],
      },
      {
        heading: "Burning common answers before your rival does",
        items: [
          "Burn common answers early. If both of you are saving the same superstar, whoever needs him second is stuck.",
        ],
      },
      {
        heading: "Playing the board and not just the trivia",
        items: [
          "Play the board, not just the trivia. A boring cell that blocks four in a row beats a clever one that does not.",
        ],
      },
      {
        heading: "Treating skip as a real move",
        items: [
          "The skip button is a real move. Losing a turn beats feeding a wrong guess streak.",
        ],
      },
    ],
    faqs: [
      { q: "Can I play alone?", a: "There is no bot, so solo play means running both sides. It works fine as trivia practice." },
      { q: "What if the checker rejects a correct answer?", a: "You keep your turn, so try again or pick another player. There is also a report button on the page if a call looks wrong." },
      { q: "Do the boards change?", a: "Yes. Each new game draws one of several curated boards, from Legends and Dynasties to Draft Pedigree, so the label combinations stay fresh." },
    ],
  },

  '/nba-chain': {
    intro: [
      "Every NBA career is a web of teammates, and this game makes you walk it. Start from one star, then name a teammate of his, then a teammate of that guy, on and on.",
      "One wrong link ends the run. The deeper you go, the more names you burn, and the more you find yourself trading superstars for that one backup center who played everywhere.",
    ],
    headings: {
      howToPlay: "How to play NBA Chain, a free teammate connection game",
      rules: "NBA Chain rules for links, mistakes and the two modes",
      example: "NBA Chain walkthrough: from Dirk Nowitzki to a broken link",
      tips: "NBA Chain tips for journeymen and playing it safe",
      faq: "NBA Chain FAQ: teammates, verification and saved streaks",
    },
    howToPlaySections: [
      {
        heading: "Starting from a famous first player",
        items: [
          "The game hands you a starting player, someone famous like LeBron James or Kevin Garnett.",
        ],
      },
      {
        heading: "Naming a teammate of the current player",
        items: [
          "Name any player who was an NBA teammate of the current player.",
        ],
        subsections: [
          {
            heading: "How the link gets verified and shown",
            items: [
              "The link gets verified, and the shared team shows up on the chain.",
            ],
          },
        ],
      },
      {
        heading: "Connecting each new link to the last",
        items: [
          "Keep adding links. Each new player must connect to the one right before them.",
        ],
      },
      {
        heading: "Choosing Endless or Round mode",
        items: [
          "Play Endless to chase a record, or Round mode for a fixed 10 pick challenge against par.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "What instantly ends a run",
        items: [
          "A wrong link ends the game instantly. So does repeating any player already in the chain.",
        ],
      },
      {
        heading: "Endless mode and its saved streak",
        items: [
          "Endless mode: build until you break, and your best streak saves on your device.",
        ],
      },
      {
        heading: "Round mode's ten picks and par of seven",
        items: [
          "Round mode: exactly 10 picks, with par set at 7.",
        ],
      },
      {
        heading: "Banking a score before you risk it",
        items: [
          "You can end a run voluntarily and bank the score.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Starting from Dirk Nowitzki and the title Mavs",
        paragraphs: [
          "Start: Dirk Nowitzki. You go Jason Kidd from the title Mavs, then from Kidd's Nets years you pull Vince Carter, and from Carter's Raptors days you grab Tracy McGrady.",
        ],
      },
      {
        heading: "Gambling on a half remembered teammate",
        paragraphs: [
          "Eight links deep, you gamble on a teammate you half remember. No shared team. Chain of 8.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Routing through six stop journeymen",
        items: [
          "Route through journeymen. A guy with six career stops opens six directions.",
        ],
      },
      {
        heading: "Long careers as bridges between eras",
        items: [
          "Long careers are bridges between eras. Veterans who played 18 plus seasons connect generations.",
        ],
      },
      {
        heading: "Avoiding a one team dead end",
        items: [
          "Do not chain into a dead end. A one team legend late in the run leaves you only his teammates.",
        ],
      },
      {
        heading: "Playing it safe in Round mode",
        items: [
          "In Round mode you just need 10 clean links, so take the safest connection every time.",
        ],
      },
    ],
    faqs: [
      { q: "What counts as teammates?", a: "The two players must have shared an NBA team, and the check tells you which one. Overlapping on the roster is the standard, so pick pairs you are sure actually crossed paths." },
      { q: "Do I lose if the connection cannot be verified due to a network hiccup?", a: "No. If verification fails for technical reasons, nothing is added and nothing ends. You just try the same link again." },
      { q: "Where is my best streak stored?", a: "On your device. Play on the same browser and the game keeps showing the record you are chasing." },
    ],
  },

  '/nba-higher-lower': {
    intro: [
      "Two legends, one question: who scored more career points? That is the entire game, and it is much harder than it sounds.",
      "The pool is the top 80 scorers in NBA history, so there are no easy outs. Everyone on screen scored a mountain of points. You are just deciding whose mountain is taller.",
    ],
    headings: {
      howToPlay: "How to play NBA Higher or Lower, a daily scoring trivia game",
      rules: "NBA Higher or Lower rules for rounds, streaks and ties",
      example: "NBA Higher or Lower walkthrough: Kobe, Jordan and era math",
      tips: "NBA Higher or Lower tips for longevity and guarding streaks",
      faq: "NBA Higher or Lower FAQ: scoring totals and the player pool",
    },
    howToPlaySections: [
      {
        heading: "Reading the two player cards",
        items: [
          "Look at the two player cards: name, position, franchises and final season.",
        ],
      },
      {
        heading: "Tapping the player with more career points",
        items: [
          "Tap the player you think finished with more career points.",
        ],
      },
      {
        heading: "Watching the totals flip and the next pair load",
        items: [
          "The totals flip over, your answer gets marked, and the next pair loads.",
        ],
      },
      {
        heading: "Surviving all ten rounds",
        items: [
          "Survive all 10 rounds and post your score.",
        ],
      },
      {
        heading: "Playing Daily then switching to Unlimited",
        items: [
          "Play the Daily, then switch to Unlimited if you want more.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Ten rounds worth ten points each",
        items: [
          "Each game is 10 rounds, and every correct answer is worth 10 points.",
        ],
      },
      {
        heading: "How the streak bonus grows",
        items: [
          "Consecutive correct answers earn a growing streak bonus. A perfect 10 for 10 run scores 325.",
        ],
        subsections: [
          {
            heading: "Why exact ties always count",
            items: [
              "Exact ties count as correct no matter which side you pick.",
            ],
          },
        ],
      },
      {
        heading: "Daily mode's shared pairs at midnight",
        items: [
          "Daily mode serves everyone the same pairs, once per day, with a fresh set every day at midnight Eastern.",
        ],
      },
      {
        heading: "Hard mode in Unlimited only",
        items: [
          "Hard mode pairs players with close totals, and it only applies in Unlimited.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Kobe Bryant against Michael Jordan",
        paragraphs: [
          "Round one gives you Kobe Bryant against Michael Jordan. Feels like a coin flip, but Kobe played 20 seasons and finished ahead, 33,643 to 32,292.",
        ],
      },
      {
        heading: "Era math and a streak that snaps",
        paragraphs: [
          "Then comes a 1960s name against a 2010s star, and era math takes over. An eight answer streak builds, round nine snaps it, and you close at 230.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Longevity usually beats a short peak",
        items: [
          "Longevity beats peak. A 19 year career of good scoring usually outpoints a short brilliant one.",
        ],
      },
      {
        heading: "Reading the final season for career length",
        items: [
          "Check the final season on the card. It quietly tells you how long the career ran.",
        ],
      },
      {
        heading: "Multiple franchises as a longevity clue",
        items: [
          "Multiple franchises often means a long career, which means more total points.",
        ],
      },
      {
        heading: "Guarding your streak in the final rounds",
        items: [
          "Guard your streak late. Rounds eight through ten carry the biggest bonuses.",
        ],
      },
    ],
    faqs: [
      { q: "Is it always career points?", a: "Yes, this one is pure career regular season scoring totals. No averages, no playoff points, just the full body of work." },
      { q: "What is the highest possible score?", a: "325. That is all 10 correct with the streak never breaking, since each consecutive answer stacks a bigger bonus on the base 10 points." },
      { q: "Who can show up?", a: "Only the top 80 career scorers in league history, from active stars to names your dad swears by." },
    ],
  },

  '/nba-grid': {
    intro: [
      "Nine cells, nine guesses, zero mercy. This is the NBA team grid formula: every cell sits at the crossroads of a row and a column, and you need one player whose career satisfies both.",
      "Sometimes that means two franchises, sometimes a franchise plus a milestone like 10,000 points. The obvious names run out fast.",
    ],
    headings: {
      howToPlay: "How to play NBA Franchise Grid, a daily basketball guessing game",
      rules: "NBA Franchise Grid rules for guesses, franchises and milestones",
      example: "NBA Franchise Grid walkthrough: Shaquille O'Neal and Scottie Pippen",
      tips: "NBA Franchise Grid tips for scanning and milestone journeymen",
      faq: "NBA Franchise Grid FAQ: answers, difficulty and daily resets",
    },
    howToPlaySections: [
      {
        heading: "Reading the row and column labels",
        items: [
          "Read the three row labels and three column labels. They are NBA franchises or career milestones.",
        ],
      },
      {
        heading: "Tapping a cell and typing a name",
        items: [
          "Tap any empty cell and type a player name.",
        ],
      },
      {
        heading: "Picking a suggestion that matches both labels",
        items: [
          "Pick from the suggestions. If the career matches both labels, the cell turns green.",
        ],
      },
      {
        heading: "What a wrong answer costs you",
        items: [
          "A wrong answer costs one of your 9 guesses and leaves the cell empty.",
        ],
      },
      {
        heading: "Filling all nine cells before guesses run out",
        items: [
          "Fill all nine cells before the guesses run out.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Nine guesses for nine cells",
        items: [
          "You get 9 total guesses for 9 cells, so a perfect game has zero misses.",
        ],
      },
      {
        heading: "Each player usable once per grid",
        items: [
          "Each player can only be used once per grid.",
        ],
      },
      {
        heading: "The pool of franchises and milestones",
        items: [
          "Categories come from a pool of 16 franchises plus three milestones: 10,000+ career points, 5,000+ career rebounds and 900+ games played.",
        ],
      },
      {
        heading: "The daily grid and its saved progress",
        items: [
          "The daily grid is the same for everyone and your progress saves. A new one drops every day at midnight Eastern.",
        ],
        subsections: [
          {
            heading: "Unlimited mode's difficulty tiers",
            items: [
              "Unlimited mode adds difficulty tiers: easy uses two milestone lines, normal uses one, hard is all franchises.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Lakers and Celtics resolved by Shaquille O'Neal",
        paragraphs: [
          "Top left wants Lakers plus Celtics. You take a second, then remember Shaquille O'Neal finished up in Boston. Green.",
        ],
      },
      {
        heading: "Saving Jordan and spending Scottie Pippen instead",
        paragraphs: [
          "Next, Bulls plus 10,000+ career points. Jordan is the reflex, but you save him in case a tougher Bulls cell shows up, and spend Scottie Pippen instead. That little hesitation is the whole game.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Scanning the grid before your first guess",
        items: [
          "Scan the full grid before guessing. The hardest intersection should get your rarest player.",
        ],
      },
      {
        heading: "Journeymen as the milestone cheat code",
        items: [
          "Journeymen with 900+ games are the milestone cheat code, and they are rarely anyone's first thought.",
        ],
      },
      {
        heading: "Trusting the instant career data check",
        items: [
          "Answers check against career data instantly, so this is a memory game, not a debate.",
        ],
      },
      {
        heading: "Why short careers struggle with milestones",
        items: [
          "Short careers ruin milestone cells. A five year star probably misses the games played bar.",
        ],
      },
    ],
    faqs: [
      { q: "Does every cell have an answer?", a: "Yes. Every pairing in the pool has at least 25 qualifying players, so a blank cell is a you problem, not a board problem." },
      { q: "Why are some famous franchises missing?", a: "The pool sticks to 16 franchises whose history lives under one code, so relocation heavy teams like the Thunder and Grizzlies sit out to keep answers clean." },
      { q: "Do wrong guesses reveal anything?", a: "No hints, just a red flash and one fewer guess. Treat every submission like it is your last." },
    ],
  },

  '/nba-connections': {
    intro: [
      "Twenty NBA players sit in a grid, and they are not random. Hiding inside are four groups of five, each tied by one connection: a shared franchise, a milestone, a birth country, a draft slot. Find all four before your lives run out.",
      "If you came from the word puzzle world, one warning: this NBA connections game runs bigger than the format you know. Groups are five deep instead of four, so there are twenty names to sort and a fifth guy to find for every theme. The easy four come quick. The fifth is where doubt moves in.",
      "Equal parts trivia and logic, and that mix is what makes a basketball connections puzzle sticky. Knowing a player is step one. Knowing which part of his career the board cares about is the game.",
    ],
    headings: {
      howToPlay: "How to play NBA Connections, a free online basketball trivia puzzle",
      rules: "NBA Connections rules: groups, lives and the daily puzzle",
      example: "NBA Connections walkthrough: a Miami Heat group and its imposter",
      tips: "NBA Connections tips for finding the fifth player every time",
      faq: "NBA Connections FAQ: daily puzzles, lives and player groups",
    },
    howToPlaySections: [
      {
        heading: "Reading the board before you touch anything",
        items: [
          "Read all 20 names before you touch anything. First instincts are good, first submissions are not.",
        ],
      },
      {
        heading: "Selecting five players you believe connect",
        items: [
          "Tap 5 players you believe share a connection. Tap again to deselect.",
        ],
        subsections: [
          {
            heading: "What happens when a group locks in",
            items: [
              "Hit Submit. A correct five locks in, shows its theme, and leaves the board.",
            ],
          },
        ],
      },
      {
        heading: "What a wrong guess costs you",
        items: [
          "A wrong five shakes the board and costs one of your 4 lives.",
        ],
      },
      {
        heading: "Group colors from easiest to hardest",
        items: [
          "Group colors run yellow, green, blue, purple, from easiest to hardest.",
        ],
      },
      {
        heading: "Clearing all four groups to win",
        items: [
          "Clear all four groups to win. Run out of lives and the remaining answers are revealed.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Board size: four groups of five",
        items: [
          "Every puzzle is exactly 4 groups of 5 players, 20 names total.",
        ],
      },
      {
        heading: "Four lives and the cost of a miss",
        items: [
          "You have 4 lives, and every wrong submission costs one.",
        ],
      },
      {
        heading: "One group per player, never two",
        items: [
          "Each player belongs to exactly one group in the puzzle. No name ever fits two answers.",
        ],
      },
      {
        heading: "Daily puzzle versus unlimited boards",
        items: [
          "The daily puzzle is identical for everyone, progress saves, and a fresh one lands every day at midnight Eastern. Unlimited deals random boards from the pool.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A Miami Heat group hides an imposter",
        paragraphs: [
          "Say the board includes Dwyane Wade, Alonzo Mourning, Udonis Haslem, Chris Bosh and Tim Hardaway. Heat, obviously. Except Hardaway was a point guard with big assist numbers, and you suspect an assists group too. That collision is the whole puzzle.",
        ],
      },
      {
        heading: "Counting career assists to settle it",
        paragraphs: [
          "So you count. Hardaway sits comfortably short of 10,000 career assists, while John Stockton, Jason Kidd and Steve Nash all cleared it. Hardaway goes back in the Heat pile, and both groups lock in clean.",
        ],
      },
      {
        heading: "Career scorers untangled from a draft group",
        paragraphs: [
          "The last trap is the scorers. Karl Malone, Kobe Bryant, Dirk Nowitzki and Carmelo Anthony scream career points, and your eye wants Allen Iverson as the fifth. Except Iverson was a number one overall pick, and Yao Ming and Zion Williamson are sitting there looking suspiciously like a draft group. Save Iverson for them, and the real fifth scorer appears by elimination. Lesson learned: verify the fifth name, always.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Proving the fifth name before you submit",
        items: [
          "Find the fifth before you submit. Anyone can spot four Lakers. The theme is only proven when a fifth fits.",
        ],
      },
      {
        heading: "Reading an overlap as a warning sign",
        items: [
          "If one player fits two of your working themes, one theme is wrong. Treat the overlap as a compass.",
        ],
      },
      {
        heading: "Where star scorers like to hide",
        items: [
          "Star scorers hide in draft and country groups. Check where a player was born and picked before filing him under points.",
        ],
      },
      {
        heading: "Choosing which group to submit first",
        items: [
          "Start with the group you would bet a life on, whatever its color. Five names off the board makes everything else easier to see.",
          "Down to two groups and unsure? Submit your stronger read. If it hits, the last group solves itself.",
        ],
      },
    ],
    faqs: [
      { q: "How is this different from other connections games?", a: "Three ways: it is all basketball, groups are five players instead of four, and you get 4 lives. Bigger groups make themes easier to spot but harder to complete." },
      { q: "Is there a one away warning?", a: "No. A wrong submission costs a life even if four of five were right, which is why the fifth name deserves the most thought." },
      { q: "Is everyone solving the same puzzle?", a: "In daily mode, yes, the whole world gets the same 20 players, and progress saves if you leave. Unlimited deals random boards." },
      { q: "What kinds of connections show up?", a: "Franchises, career milestones like 28,000 points or 2,000 threes, birth countries like France or Canada, and draft slots like number one overall. Every grouping is checked against real career data." },
      { q: "Do I need an account to play?", a: "No. An account is optional and only matters if you want saved stats and leaderboards. The daily puzzle itself needs nothing." },
    ],
  },

  '/nba-career': {
    intro: [
      "A mystery NBA player is hiding behind a stack of clues, and the first one is nearly useless on purpose. You start with just a position and 1,000 points on the table.",
      "Every clue you flip makes the answer easier and the payout smaller. The whole game is one question: how early do you dare to guess?",
    ],
    headings: {
      howToPlay: "How to play NBA Career Path, a free NBA guessing game",
      rules: "NBA Career Path rules: the score ladder and free guesses",
      example: "NBA Career Path walkthrough: guessing Hakeem Olajuwon",
      tips: "NBA Career Path tips for cracking the clues fast",
      faq: "NBA Career Path FAQ: scoring, hard mode and last names",
    },
    howToPlaySections: [
      {
        heading: "Starting with the position clue",
        items: [
          "Start with the position clue and a pot of 1,000 points.",
        ],
      },
      {
        heading: "Guessing for free at any time",
        items: [
          "Guess whenever you like. Wrong guesses are free, so swing away.",
        ],
      },
      {
        heading: "Revealing clues one at a time",
        items: [
          "Stuck? Reveal the next clue: country, then draft info, then teams, then career stats, then awards.",
        ],
      },
      {
        heading: "What each reveal costs you",
        items: [
          "Each reveal costs 150 points, down to a floor of 100.",
        ],
      },
      {
        heading: "Banking points or giving up",
        items: [
          "Name the player to bank whatever is left, or give up to see the answer.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The score ladder from 1000 down to 100",
        items: [
          "The score ladder runs 1000, 850, 700, 550, 400, 250, 100 depending on clues used.",
        ],
      },
      {
        heading: "Free guesses, costly reveals",
        items: [
          "Wrong guesses cost nothing. Only revealed clues eat your score.",
        ],
      },
      {
        heading: "A last name counts as correct",
        items: [
          "A last name alone counts as a correct guess.",
        ],
      },
      {
        heading: "Daily mode and hard mode's hidden clues",
        items: [
          "Daily mode gives everyone the same player each day, and hard mode hides the two easiest clues.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A center from Nigeria narrows the field",
        paragraphs: [
          "The position says center. That could be anyone, so you flip country: Nigeria. Interesting. One more flip, draft info: first overall pick, 1984.",
        ],
      },
      {
        heading: "Two clues in, the answer is obvious",
        paragraphs: [
          "Now it is obvious. Hakeem Olajuwon, guessed with two clues used, banks 700 points. Greedy players flip nothing and gamble at 1,000. Cowards flip five and keep 250. Pick your identity.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Guessing early costs you nothing",
        items: [
          "Guess early and often, since misses are free. Even a wild swing at 1,000 costs nothing.",
        ],
      },
      {
        heading: "Why the draft clue breaks the case",
        items: [
          "The draft clue is usually the code breaker. Year plus pick number narrows history fast.",
        ],
        subsections: [
          {
            heading: "Spotting a one team legend instantly",
            items: [
              "Teams reveal one franchise at a time, so a one team legend gets exposed instantly.",
            ],
          },
        ],
      },
      {
        heading: "Practicing stat lines in unlimited mode",
        items: [
          "In unlimited mode, practice reading stat lines. Career numbers have a shape, and shapes have names.",
        ],
      },
    ],
    faqs: [
      { q: "Do wrong guesses lower my score?", a: "No. You can guess as many times as you want at no cost. The only thing that drains the pot is revealing clues, at 150 points each." },
      { q: "Can I just type the last name?", a: "Yes. The game accepts the surname on its own, so no need to remember exactly how a first name is spelled." },
      { q: "What does hard mode change?", a: "It hides the two gimme clues, position and country, so you are working from draft info, teams, stats and awards. Scoring stays the same." },
    ],
  },

  '/missing-five': {
    intro: [
      "You remember the game. The shot, the score, the confetti. This one bets you do not remember who actually started.",
      "Missing Five shows a real starting five from a famous NBA Finals night with one name blanked. Every lineup is verified against the official box score, and the blanks are chosen to hurt.",
    ],
    headings: {
      howToPlay: "How to play Missing Five, a free NBA Finals lineup game",
      rules: "Missing Five rules: guesses, hints and hard mode",
      example: "Missing Five walkthrough: the 2016 Finals Game 7 blank",
      tips: "Missing Five tips for naming the missing starter fast",
      faq: "Missing Five FAQ: real lineups, hints and surname guesses",
    },
    howToPlaySections: [
      {
        heading: "Reading the game context first",
        items: [
          "Read the game context: the matchup, the date, the final score, the venue.",
        ],
      },
      {
        heading: "Spotting the blank starter on the court",
        items: [
          "Look at the court. Four starters are named, one is a glowing blank with only the position showing.",
        ],
      },
      {
        heading: "Typing your guess within three tries",
        items: [
          "Type the missing starter. You have 3 guesses.",
        ],
      },
      {
        heading: "What each miss unlocks",
        items: [
          "Each miss unlocks a hint, starting with the player's nationality, then the first letter of the surname.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring across three guesses",
        items: [
          "3 guesses per lineup: 100 points on the first, 70 on the second, 40 on the third.",
        ],
      },
      {
        heading: "When a surname alone is enough",
        items: [
          "The surname alone counts, as long as it is at least four letters.",
        ],
      },
      {
        heading: "What hard mode strips away",
        items: [
          "Hard mode strips the hints, the name suggestions, and even the position labels.",
        ],
      },
      {
        heading: "Daily lineups versus unlimited mode",
        items: [
          "The daily lineup is the same for everyone and changes every day at midnight Eastern. Unlimited mode keeps dealing new ones.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A confident guess that was hurt that night",
        paragraphs: [
          "The card reads 2016 NBA Finals, Game 7, Warriors starting five, and the blank is at center. You type Andrew Bogut with full confidence. Wrong. Bogut was hurt and never played that night.",
        ],
      },
      {
        heading: "The nationality hint that unlocks the answer",
        paragraphs: [
          "The hint says Nigeria, and somewhere in your brain a backup big raises his hand. Second guess lands. 70 points and a story.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Weighing injuries before the famous name",
        items: [
          "Think about injuries and matchups before you type the famous name. Finals coaches loved a surprise starter.",
        ],
      },
      {
        heading: "Why the score line pins the exact night",
        items: [
          "The score line and date matter. They pin the exact night, not just the series.",
        ],
      },
      {
        heading: "Role players start title games more than you think",
        items: [
          "Role players who started title games are the answer more often than superstars. The stars are usually already on the card.",
        ],
        subsections: [
          {
            heading: "Leaning into a surprising nationality hint",
            items: [
              "If the nationality hint surprises you, lean into it. It usually eliminates your whole shortlist at once.",
            ],
          },
        ],
      },
    ],
    faqs: [
      { q: "Are these lineups real?", a: "Yes, every five was checked against the official box score for that exact game. When the answer feels wrong, that is the point: the real starter is often not the guy history remembers." },
      { q: "Why is the answer sometimes a nobody?", a: "Coaches made one night changes in huge games, and those starters are forgotten. The gap between memory and box score is the whole game." },
      { q: "Do I have to spell the full name?", a: "No. The surname on its own works, and outside hard mode the suggestion list helps with spelling." },
    ],
  },

  '/perfect-lineup-nba': {
    intro: [
      "Five slots, and the game has opinions. Three of them come stamped with a constraint, a franchise or a decade, and only players matching the tag can go there.",
      "The pool is a curated set of greats and current stars, so every pick is good. The puzzle is squeezing the best combination through the constraints while keeping the roster connected.",
    ],
    headings: {
      howToPlay: "How to play Perfect Lineup: NBA, a free starting five builder",
      rules: "Perfect Lineup: NBA rules: constraints, chemistry and grades",
      example: "Perfect Lineup: NBA walkthrough: a Lakers double link",
      tips: "Perfect Lineup: NBA tips for building real chemistry",
      faq: "Perfect Lineup: NBA FAQ: the player pool, daily sets and grading",
    },
    howToPlaySections: [
      {
        heading: "Checking the five slots and their constraints",
        items: [
          "Check the five slots: PG, SG, SF, PF and C. Three carry a constraint like Lakers or 1990s.",
        ],
      },
      {
        heading: "Picking eligible players for each slot",
        items: [
          "Tap a slot and pick from the eligible players. Constrained slots only list players who fit the tag.",
        ],
      },
      {
        heading: "Filling all five and watching chemistry",
        items: [
          "Fill all five, watching for chemistry links between picks.",
        ],
      },
      {
        heading: "Simulating for a scoreline and a grade",
        items: [
          "Hit Simulate for a scoreline, a grade and a chemistry rating.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Three constrained slots, four eligible players",
        items: [
          "Exactly 3 of the 5 slots carry a team or era constraint, and every constraint leaves at least 4 eligible players.",
        ],
      },
      {
        heading: "How positions flex one step",
        items: [
          "Positions flex one step: the PG slot also takes shooting guards, the C slot also takes power forwards.",
        ],
      },
      {
        heading: "The rating split between quality and chemistry",
        items: [
          "Your final rating is 80 percent player quality and 20 percent chemistry.",
        ],
        subsections: [
          {
            heading: "Where chemistry links come from",
            items: [
              "Chemistry comes from sharing a franchise or an era with at least one other pick.",
            ],
          },
        ],
      },
      {
        heading: "Grades from A+ down to D",
        items: [
          "Grades run from A+ at a 92 rating down to D. The daily constraint set is the same for everyone and changes every day.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Kareem and Magic lock a double link",
        paragraphs: [
          "Say the center slot demands Lakers and the point guard slot demands 1980s. Kareem Abdul-Jabbar takes center, and Magic Johnson at point becomes a double link: same team, same decade.",
        ],
      },
      {
        heading: "Two modern wings round out the five",
        paragraphs: [
          "Two modern wings and a 90s power forward round it out. Chemistry lifts a decent roster to an A and a green and yellow emoji row.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Building around the constraints first",
        items: [
          "Build around the constraints first. The two free slots fix whatever the tags forced on you.",
        ],
      },
      {
        heading: "Chasing two links for double chemistry",
        items: [
          "Chase double links. A pick sharing both team and era with a teammate feeds chemistry twice.",
        ],
      },
      {
        heading: "Why a connected roster beats five strangers",
        items: [
          "Do not draft five strangers. A weaker player who connects often beats a loner star.",
        ],
      },
    ],
    faqs: [
      { q: "Who is in the player pool?", a: "About 66 curated stars across every era, from Magic and Kareem to current MVPs. Not the full history books, which keeps every slot a real decision." },
      { q: "Can I redo my daily lineup?", a: "Yes. After simulating you can edit the same constraint set and run it again, chasing a better grade all day." },
      { q: "How exact is the scoring?", a: "Your five ratings average into 80 percent of the score, chemistry is the other 20, and the result maps to a grade and a shareable scoreline." },
    ],
  },

  '/nba-gauntlet-draft': {
    intro: [
      "The draft mode, NBA style: five picks, one per starting five slot, five real players a pick from a genuine star to a bargain, and you keep exactly one.",
      "Then the cup begins. Your finished five runs five knockout rounds against ever stronger invented opposition, rated 85 up to 101, and overtime when the game is level.",
      "The run is decided entirely by the five you drafted: the same lineup always runs the same gauntlet, so every pick is the game.",
    ],
    headings: {
      howToPlay: "How to play Gauntlet Draft: NBA, a free online card draft game",
      rules: "Gauntlet Draft: NBA rules: cards, the knockout and ratings",
      example: "Gauntlet Draft: NBA walkthrough: a center pick and a title run",
      tips: "Gauntlet Draft: NBA tips for drafting a title worthy five",
      faq: "Gauntlet Draft: NBA FAQ: the daily draft and real players",
    },
    howToPlaySections: [
      {
        heading: "Picking daily or unlimited mode",
        items: [
          "Pick the daily gauntlet (the same five card choices for everyone today) or unlimited for a fresh draft.",
        ],
      },
      {
        heading: "Drafting one card per slot",
        items: [
          "For each slot, PG through C, read the five cards, star to bargain, and tap the one you keep. Positions flex the same way Perfect Lineup's do: an SG slot also takes a PG or an SF.",
        ],
      },
      {
        heading: "How the knockout begins after pick five",
        items: [
          "After pick five the knockout starts on its own: five rounds, one match each, revealed one at a time.",
        ],
      },
      {
        heading: "Scoring survival points and the trophy",
        items: [
          "Survive a round for 16 points; lift the trophy for exactly 100.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Real players against invented opponents",
        items: [
          "Every card is a real player from the same curated pool Perfect Lineup: NBA plays, roughly 66 names across every era; every opponent club is invented on purpose.",
        ],
      },
      {
        heading: "How the five cards spread across ratings",
        items: [
          "The five cards per slot are spread across the pool's rating range, so a top-tier card and a bargain are always both on the table.",
        ],
        subsections: [
          {
            heading: "Never dealt the same player twice",
            items: [
              "No player is dealt twice in one draft.",
            ],
          },
        ],
      },
      {
        heading: "Why every replay stays deterministic",
        items: [
          "The knockout is deterministic in your five: scoring comes from the rating gap, level games go to overtime, and replaying the same lineup replays the same cup.",
        ],
      },
      {
        heading: "Opposition ratings climbing round by round",
        items: [
          "Opposition ratings climb 85, 89, 93, 97, 101. A bargain five usually falls in the first two rounds, an elite one reaches the final as a slight underdog, and even a perfect draft lifts the trophy about one run in ten.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A center slot with five cards to choose",
        paragraphs: [
          "The center slot deals a 98 rated all timer next to a 91, an 88, a 86 and an 84. There is no cost to any of them, so the 98 is the pick unless you are chasing a specific team or era on the card.",
        ],
      },
      {
        heading: "Two rounds survived and one regret at power forward",
        paragraphs: [
          "Your finished five rates 96. The Qualifier wins big, the Last Sixteen is close, the Quarter Final needs extra time, and the Semi Final ends the run. Two rounds survived, 32 points, and the card you would redo is the 88 you took at power forward.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why the center card matters as much as guard",
        items: [
          "The center card matters as much as the point guard card: one weak slot drags the whole rating.",
        ],
      },
      {
        heading: "Bargain cards versus chasing the score",
        items: [
          "The bargain cards exist for flavor runs, not for winning. If the score is the goal, draft the biggest number that fits.",
        ],
      },
      {
        heading: "Watching your running rating climb",
        items: [
          "Champions need a five in the high nineties. Check your running rating under the cards as you go.",
        ],
      },
    ],
    faqs: [
      { q: "Is the daily draft the same for everyone?", a: "Yes. One shared set of five card choices per Eastern Time date, so daily scores compare fairly." },
      { q: "Are the opponents real teams?", a: "No, and that is deliberate: every gauntlet opponent is an invented club, so no real logo or name is borrowed. The players you draft are real, from the same pool Perfect Lineup: NBA plays." },
      { q: "Is this the same game as the soccer Gauntlet Draft?", a: "Same engine, NBA's own pool and positions. Five picks instead of eleven, because a basketball lineup is five players, and the ladder is tuned to this pool's own rating range." },
    ],
  },

  '/conquest-nba': {
    intro: [
      "Pick a team, inherit the land around its arena, and try to own the entire country. This is the NBA imperialism map format: every game swallows empires whole.",
      "A loss does not cost a border town. It costs everything, every territory, straight into the winner's hands. Fourteen rounds later the map is a few giant blobs with grudges.",
    ],
    headings: {
      howToPlay: "How to play NBA Conquest, a free NBA territory takeover game",
      rules: "NBA Conquest rules: annexing empires and scoring predictions",
      example: "NBA Conquest walkthrough: Denver's empire rises and falls",
      tips: "NBA Conquest tips for calling games and reading the map",
      faq: "NBA Conquest FAQ: the Daily Challenge and losing everything",
    },
    howToPlaySections: [
      {
        heading: "Picking your team in Imperialism mode",
        items: [
          "Pick your team in Imperialism mode. Every territory on the map starts owned by its nearest NBA arena.",
        ],
      },
      {
        heading: "Calling the winner of the featured game",
        items: [
          "Each round, all 30 teams play. Before it runs, you call the winner of the featured game, your team's whenever they play.",
        ],
      },
      {
        heading: "Watching the map redraw after each round",
        items: [
          "Watch the results redraw the map as losers hand over entire empires.",
        ],
      },
      {
        heading: "Surviving 14 rounds to reach the playoffs",
        items: [
          "Survive 14 rounds. The top 8 empires by territory make the playoffs.",
        ],
      },
      {
        heading: "Winning three rounds to rule America",
        items: [
          "Win the Quarterfinals, Semifinals and Imperial Finals to rule America.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How annexation works each round",
        items: [
          "Winners annex everything the loser owned, every single round.",
          "Wiped off the map does not mean out: one win takes your conqueror's whole empire back.",
        ],
      },
      {
        heading: "Scoring predictions and territory",
        items: [
          "Correct predictions pay 25 points each. Final score adds 3 per territory held, 50 for making the playoffs, 200 if your team takes the title.",
        ],
      },
      {
        heading: "How playoff seeding is decided",
        items: [
          "Playoff seeding is territories first, season record as the tiebreaker.",
        ],
      },
      {
        heading: "What Arcade mode adds",
        items: [
          "Arcade mode is the original formula: battles, stealing a player from every beaten team, and power-ups.",
        ],
      },
      {
        heading: "How the Daily Challenge is seeded",
        items: [
          "The Daily Challenge deals every player the same date-seeded season: same starting map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Denver's empire falls in round six",
        paragraphs: [
          "You take Denver. Two early wins triple your land, then the Mavericks flatten you in round six and the whole empire changes color.",
        ],
      },
      {
        heading: "A revenge win sets up an Imperial Finals run",
        paragraphs: [
          "Round eight, Denver beats Dallas in overtime and takes back everything they own, half of Texas included. You sneak in as the 7 seed and fall in the Imperial Finals to a Celtics empire covering the East Coast. Run it back!",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Predictions as steady income",
        items: [
          "Predictions are steady income. Territories can vanish in one night, but called games are banked forever.",
        ],
      },
      {
        heading: "Reading the win percentage before you call it",
        items: [
          "Check the win percentage on each matchup before calling it. Upsets happen, but math is math.",
        ],
        subsections: [
          {
            heading: "Why playoff seeding sneaks up fast",
            items: [
              "Peek at the standings. Playoff seeding sneaks up fast, and territories decide it.",
            ],
          },
        ],
      },
    ],
    faqs: [
      {
        q: "How does the Daily Challenge work?",
        a: "Everyone on the planet gets the same season today: identical starting map, identical fixtures, identical results. Your score comes from which empire you back and how well you call the games, so comparing scores is a fair fight. One scored run per day, streaks build if you show up daily, and a fresh map drops at midnight Eastern. Free Play stays unlimited.",
      },
      { q: "What happens when my team loses everything?", a: "You stay in the game. Landless teams keep playing, and the moment they win they seize their conqueror's entire empire. The best runs start from zero." },
      { q: "Can the season end before round 14?", a: "Yes. If one team conquers every territory, the season ends right there with a total conquest." },
      { q: "How do the two modes differ?", a: "Imperialism is the map format with predictions and annexed empires. Arcade is the original battle mode with player steals and power-ups." },
    ],
  },

  '/nba-front-office': {
    intro: [
      "Running an NBA franchise looks easy from the couch. This sim hands you a real rotation, a cap sheet and 29 rivals so you can find out.",
      "Waive the deadweight, sign the bargains, swing trades the computer actually weighs, and steer the season toward the bracket and maybe a banner. Dynasties are the real scoreboard.",
    ],
    headings: {
      howToPlay: "How to play NBA Front Office, a free NBA GM simulator",
      rules: "NBA Front Office rules: the cap, trades and the play in",
      example: "NBA Front Office walkthrough: a rebuild that reaches game 7",
      tips: "NBA Front Office tips for building a lasting contender",
      faq: "NBA Front Office FAQ: rosters, trades and getting fired",
    },
    howToPlaySections: [
      {
        heading: "Inheriting a real 30 team rotation",
        items: [
          "Pick any of the 30 franchises and inherit its real rotation, rated player by player.",
        ],
      },
      {
        heading: "Reading the ownership mandate",
        items: [
          "Read the ownership mandate: a loaded roster is told to win the Finals, a mid one to make the playoffs, a thin one to hit an honest win number. It resets every offseason.",
        ],
      },
      {
        heading: "Working the roster with waivers and trades",
        items: [
          "Work the roster. Waive contracts, sign free agents with your cap room, and propose trades.",
        ],
      },
      {
        heading: "Simming the season in 20 stretches",
        items: [
          "Sim the season in 20 short stretches, watching the conference standings tighten and the mandate's live pace read.",
        ],
      },
      {
        heading: "Making the playoffs, then chasing a repeat",
        items: [
          "Finish top 6 for a direct playoff seed, or 7th through 10th for the play-in.",
          "Win four best of 7 rounds, then draft and rebuild for the repeat, as long as ownership keeps you.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Cap room and roster size limits",
        items: [
          "The cap starts at 155 million and rises 7 percent every season. Rosters hold 8 to 15 players.",
        ],
      },
      {
        heading: "How trade negotiations play out",
        items: [
          "Trades are a negotiation now: open talks and the other GM answers with a handshake, a pick demand, a lesser man, or the dial tone. You can stand firm exactly once per call, and it genuinely gambles: they blink and the price drops, or they dig in and it rises.",
        ],
      },
      {
        heading: "Reaching the play in for seeds seven to ten",
        items: [
          "The play-in covers seeds 7 through 10, with one last game deciding the 8 seed.",
        ],
      },
      {
        heading: "Draft classes and scouting uncertainty",
        items: [
          "Draft classes have 24 prospects, you pick twice, and scouting grades can miss the truth by a few points either way.",
        ],
      },
      {
        heading: "How aging and decline work each summer",
        items: [
          "Everyone ages each summer: young players develop toward potential, decline starts at 32, veterans retire.",
        ],
        subsections: [
          {
            heading: "What moves the trust meter",
            items: [
              "Trust upstairs runs 0 to 100: beat the mandate and it climbs, miss it and it falls, a banner fixes almost anything, and at zero you are fired and the save ends.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Trading an aging star for a young pick",
        paragraphs: [
          "You take a bubble team and ship an aging star for a 24 year old, pick attached. The season starts ugly.",
        ],
      },
      {
        heading: "A 9 seed run that ends in the conference finals",
        paragraphs: [
          "Then the kid pops. You sneak in at the 9 seed, win two play-in games, upset the 1 seed in seven, and lose the conference finals. The rookie scouted at 91 comes in at 87. Run it back.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why age is the real trade currency",
        items: [
          "Age is currency. The trade engine pays a premium for anyone 24 and under, so shop aging names early.",
        ],
      },
      {
        heading: "Bench quality matters when injuries hit",
        items: [
          "Your best five carry most of the load, but bench quality is real when injuries hit.",
        ],
      },
      {
        heading: "A champion roster is never truly finished",
        items: [
          "A champion is never finished. Contracts expire, and some role players walk every summer.",
        ],
      },
    ],
    faqs: [
      { q: "Are the rosters real?", a: "The players are real, about ten curated per franchise. Contracts, salaries and ages in the sim are explicitly fictional." },
      { q: "Why did my trade get rejected?", a: "The engine values rating adjusted for age and wants to come out ahead. Offer youth, take back age, or add a pick." },
      { q: "Can I get fired?", a: "Yes. Ownership grades the mandate every season and tracks trust from 0 to 100. Losing the play-in when the ask was a banner costs real trust, and at zero the save ends and you take another job." },
      { q: "Does my save persist?", a: "Yes, the league auto saves in your browser across unlimited seasons. Clearing site data wipes the franchise." },
    ],
  },

  '/nba-my-career': {
    intro: [
      "Draft night is where it starts: a made up prospect with your name, landing in a real NBA locker room. Where it ends is up to your summers.",
      "Each season prints a stat line shaped by your rating, archetype, health and team quality. Each summer drops one decision on your desk, drawn from over a hundred of them: contracts, surgeries, trade demands, tunnel fits, a rookie who idolises you, a mural in your neighborhood.",
      "You build your player's actual face before the draft, and there is a dirty side waiting whenever you want it. Taking the under on your own rebound totals, faking load management for a bettor, tanking in March, an agent advance you were never supposed to mention. Every dirty choice raises a hidden league integrity meter, and at the top of it is an indefinite suspension and a comeback on the minimum.",
    ],
    headings: {
      howToPlay: "How to play NBA My Career, a free NBA basketball career sim",
      rules: "NBA My Career rules: ratings, the rotation and the bank",
      example: "NBA My Career walkthrough: rookie drama to a title run",
      tips: "NBA My Career tips for building a lasting legacy",
      faq: "NBA My Career FAQ: real teams, free agency and badges",
    },
    howToPlaySections: [
      {
        heading: "Creating your player and picking a league",
        items: [
          "Create your player: name, one of 5 positions (PG, SG, SF, PF, C), and one of 15 archetypes, from Point God to Movement Sniper to Paint Beast.",
          "Pick your league: today's NBA, or the 2003-04 throwback with the SuperSonics in Seattle, the Nets in New Jersey, the Hornets in New Orleans and no Charlotte yet.",
        ],
        subsections: [
          {
            heading: "Building your player's look",
            items: [
              "Build your look: skin tone, hair, beard, accessories and a signature celebration, or hit Surprise me.",
            ],
          },
        ],
      },
      {
        heading: "Managing your money between seasons",
        items: [
          "Open the Bank between seasons. Savings pays 2.5% a season and never loses, five things you can put money into each have a price that moves every season whether you look or not (a fund, flats back home, two shares and a coin that halves as often as it doubles), the statement keeps your last 12 moves, and the card school on the team plane is one sitting a season on odds that are printed before you sit in.",
        ],
        subsections: [
          {
            heading: "Spending across seven aisles",
            items: [
              "Spend the money in 7 aisles: home, rides, investments, body, flex, family, and a shady aisle that only appears once you have something to hide.",
            ],
          },
        ],
      },
      {
        heading: "Following your career in the News box",
        items: [
          "Read the News box. The paper writes up every season in your own position's stat, the SocialGram shows followers read off your fanbase with three fan comments under the latest post, and the rival's card keeps the head to head against the player drafted the same year as you.",
        ],
        subsections: [
          {
            heading: "Collecting badges in the Trophy Case",
            items: [
              "Collect badges in the Trophy Case: 21 of them, from a first ring and Rookie of the Year to 30,000 career points, a triple double season and $100M to your name, each lit the moment the facts of your career say so.",
            ],
          },
        ],
      },
      {
        heading: "Getting drafted and cracking the rotation",
        items: [
          "Get drafted by a real NBA team. Stronger prospects go higher and earn more.",
          "Check the rotation. Top five picks open in the starting five; everyone else fights for the spot in camp every fall, and second-unit seasons come in bench minutes until you crack the five.",
        ],
      },
      {
        heading: "Playing seasons and handling the offseason",
        items: [
          "Sim each season for a full line: games, points, rebounds, assists, awards, team result.",
          "Handle the offseason event, one big decision per summer.",
        ],
        subsections: [
          {
            heading: "Working a real free agency window",
            items: [
              "When the contract runs out, work a real free agency window: competing offers from named franchises with their own money, length and roster quality, and one push for more on any of them.",
            ],
          },
          {
            heading: "Retiring and facing the legacy verdict",
            items: [
              "Retire when the body or the fire quits, and face the legacy verdict.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How archetypes and ratings work together",
        items: [
          "Archetypes shape the stat engine: Point Gods pile up assists, Paint Beasts eat rebounds, Bucket Getters score but break down more.",
          "All-NBA needs 62 games played, and MVP talk starts at a 92 rating.",
        ],
        subsections: [
          {
            heading: "How growth and decline unfold",
            items: [
              "Growth runs to age 25, decline starts at 32, and health erodes late unless you invest in it.",
            ],
          },
        ],
      },
      {
        heading: "How real the rotation actually is",
        items: [
          "The rotation is real: the man ahead of you is as good as your roster is, camps have memory both ways, bench seasons run at about 60 percent of a starter's numbers, and Sixth Man of the Year goes to actual second-unit seasons now. Joining a loaded contender can cost a mid player his spot in the five.",
        ],
      },
      {
        heading: "How the press reads your season",
        items: [
          "The press reads your actual season: a banner puts you on the podium, a collapse puts you in the scrum, a second-unit year brings the role question. Three answers every time, safe, honest or fiery, and the fiery one gambles your fanbase for real.",
        ],
        subsections: [
          {
            heading: "When a career finally ends",
            items: [
              "Careers end at 41, after 21 seasons, or when the rating craters. You can also walk anytime.",
            ],
          },
        ],
      },
      {
        heading: "Playing inside the 2003 throwback world",
        items: [
          "The 2003-04 throwback is a sealed 29 team world, verified against the real season: every draft, trade and signing stays inside it, and contracts pay 2003 money, about a third of today's.",
        ],
      },
      {
        heading: "Money rules in the Bank and what fans nag about",
        items: [
          "Money has rules of its own. There is a 1% fee on both sides of every trade and a $100k floor in the account that cannot be invested away; a season that leaves you under the floor is covered out of savings first, then by a forced sale of holdings at whatever the price is that day. Cards win 42% of hands and a win pays 1.15x the stake, the most you can stake is $50k or 4% of your cash, and once you are $500k down for your career the guys stop dealing you in for good. Keep sitting in while you are losing and somebody at home notices, which costs morale and fanbase.",
          "The fans nag you for the thing your position is judged on and never the other way round: a point guard hears more assists, a center hears own the glass, and nobody hears about a three, a block or a steal, because the season line does not count one.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A Rookie of the Year season turns sour",
        paragraphs: [
          "You roll a Two-Way Menace guard, go 11th, and win Rookie of the Year on a bad team. Year three, morale craters and you demand a trade. Villain arc unlocked.",
        ],
      },
      {
        heading: "A title, a Finals MVP and a Hall of Fame verdict",
        paragraphs: [
          "The new team contends. You take the discount at 28, win it all at 30, and grab Finals MVP. Decline arrives at 33, surgery buys two more years, and the verdict reads first ballot Hall of Famer. The GOAT tier stays out of reach. It usually does.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Choosing an archetype built to last",
        items: [
          "Pick the archetype for the career you want to live. Durability differences are real.",
        ],
      },
      {
        heading: "Why low health is worth fixing fast",
        items: [
          "Do not sit on low health. Injuries shred seasons, and awards need games played.",
        ],
      },
      {
        heading: "Free agency as a basketball decision, not just money",
        items: [
          "Team quality moves your stats and playoff odds. Free agency is a basketball decision, not just money: the contender offers less than the rebuild, and the roster number on the card is what your next seasons actually run on.",
        ],
      },
    ],
    faqs: [
      { q: "Can I play as a real NBA star?", a: "No, your player is fictional by design. The teams around you are real, 30 of them today and 29 in the throwback, but the career is yours to invent." },
      { q: "Can I start in a different era?", a: "Yes. The create screen has a 2003-04 throwback: the 29 team league with the Seattle SuperSonics, the New Jersey Nets and the New Orleans Hornets, and no Charlotte franchise yet. An era career never meets a team that did not exist then." },
      { q: "How does free agency work?", a: "An expired deal opens a window of real offers: your team's re-sign number plus named suitors, each with its own salary, years and roster quality. You can push any offer for more once. A weak case can get an offer pulled, but your own team never walks, so there is always a deal to sign." },
      { q: "Why am I coming off the bench?", a: "Because the starter is better, for now. Late picks usually open with the second unit behind an incumbent whose level tracks the roster's quality. Grow your rating and you will crack the five; until then bench minutes mean smaller numbers, slower fame and a real shot at Sixth Man of the Year. A thin rebuild is the fastest route to starting." },
      { q: "What does the legacy score reward most?", a: "MVPs and rings move it hardest, then Finals MVPs and All-NBA nods, plus longevity and points. The top verdict is the GOAT conversation, and it takes a stacked case." },
      { q: "What is in the Bank?", a: "Four tabs. Account holds your cash, a savings account that pays 2.5% a season, and a statement of your last 12 moves. Market is five prices that move every season, each with its own risk word and a read on whether it is cheap or dear against what it usually goes for. Cards is the card school on the team plane, one sitting a season, on odds the screen prints before you play. Shop is the 7 aisles. It is the same engine Soccer Career's phone runs on, in dollars." },
      { q: "Who is my rival?", a: "A generated player drafted the same year at your position. He plays his own seasons on the same scale you do, can win a ring before you and retire before you, and the head to head is kept for good. He is fictional, like your own player, so no real player's career is being simulated." },
      { q: "How do I earn badges?", a: "By doing the thing. Each of the 21 badges is a test on the facts of your career, checked every time you open the case: a ring, an MVP, twenty thousand points, five seasons with all 82 games played, a million dollars to your name. The 30 point season badge sits a long way under the single season scoring record, Wilt Chamberlain's 50.4 a game in 1961-62, which is where it belongs." },
      { q: "Is my career saved?", a: "Yes, progress auto saves in your browser. One career at a time, and starting fresh means retiring first." },
    ],
  },
};
