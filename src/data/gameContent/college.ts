import type { GameContentMap } from './types';

// College sports game guides. Casual human tone, no em dashes anywhere.
export const COLLEGE_CONTENT: GameContentMap = {
  '/college-grid': {
    intro: [
      "The College Football Grid is a daily 3x3 puzzle for fans who remember where guys played on Saturdays. Rows are schools like Alabama, or sometimes whole conferences. Columns are positions, awards, and draft credentials. Each of the 9 cells needs one player who fits both.",
      "If you came looking for a college football grid, this is that idea built on campus careers instead of pro rosters. The pool covers players from 2000 to 2026, and the criteria run from Heisman Winner and All-American to First Round Pick and Went Undrafted. A cfb grid tests where a guy wore a helmet first, not who drafted him.",
      "One grid a day, the same for everyone, 15 guesses, and a rarity score for style points. A fresh college football grid game lands every day at midnight Eastern.",
    ],
    howToPlay: [
      "Tap an empty cell. The game spells out both requirements, like Alabama plus Heisman Winner.",
      "Type a player name. After two letters a suggestion list appears with each player's college, but you can submit any name you can spell.",
      "Submit and wait a beat for the check. Correct picks lock in green with a rarity percentage. Wrong picks flash red.",
      "Watch the counter. Every submission spends one of your 15 guesses, right or wrong, so a perfect board leaves room for 6 misses.",
      "Fill all 9 cells or run dry, then share your Rarity Score and emoji grid.",
      "Come back tomorrow. A new grid arrives at midnight Eastern.",
    ],
    rules: [
      "You get 15 guesses to fill 9 cells, and correct answers use guesses too.",
      "A cell only accepts a player who matches its row and its column at the same time.",
      "Each correct answer shows a rarity percentage, the share of players who used the same name there. Your Rarity Score averages your correct cells, and lower is better.",
      "The player pool runs from 2000 to 2026.",
      "If the checker cannot verify a pick, no guess is charged. Just resubmit.",
    ],
    example: [
      "Say the rows are Alabama, Ohio State, and LSU, and the columns are Quarterback, Heisman Winner, and First Round Pick. You open with Alabama plus Heisman Winner and type Derrick Henry. Green, 38 percent, so over a third of players went to the same well. Mark Ingram would have scored rarer.",
      "Ohio State plus First Round Pick is a buffet, so you bank Chase Young. For LSU plus Quarterback you skip Joe Burrow and gamble on JaMarcus Russell, the first overall pick in 2007. It lands at 9 percent. Then two picks come back red and the cushion shrinks.",
      "You close the last cells with names you can defend and finish 9 for 9, using 11 of 15 guesses, for a 21 percent Rarity Score. Solid, though somebody out there remembered a 2003 backup and is sitting at 8.",
    ],
    tips: [
      "Fight the first instinct. The obvious name is the one everyone types, and rarity rewards the road less traveled.",
      "Draft columns are the safety valve. Every powerhouse has first rounders you can rattle off.",
      "Conference rows like SEC fit hundreds of players. Save them for when you are low on guesses.",
      "The suggestion list shows each player's college. Use it as a free fact check before you commit.",
      "Six misses is the whole budget, so when a cell feels like a coin flip, fill something you know first.",
    ],
    faqs: [
      {
        q: "How is this different from the NFL grid?",
        a: "Same 3x3 bones, different resume. A college football grid asks what a player did in college, so rows are programs or conferences and columns are positions, awards, and draft outcomes. This cfb grid is home turf for people who know where every first rounder went to school.",
      },
      {
        q: "What does the rarity percentage mean?",
        a: "The share of players who answered that cell with the same name. 3 percent means almost nobody thought of your guy. Lower averages make better Rarity Scores.",
      },
      {
        q: "Can I use the same player in more than one cell?",
        a: "Yes. Each cell is validated on its own, so one player can fill two intersections, with rarity tracked separately in each.",
      },
      {
        q: "What happens when an answer cannot be verified?",
        a: "The checker occasionally asks you to resubmit. No guess is charged. It is an unverified answer, not a wrong one.",
      },
      {
        q: "Do I need an account?",
        a: "No. A free account with email or Google is optional and only matters for keeping your stats.",
      },
    ],
  },

  '/guess-the-college': {
    intro: [
      "Somewhere in Division 1 there is one school the game has in mind, and your job is to name it before the clues run out. You start with a single vibe word and end, if it goes badly, at the school colors.",
      "Guess early and look like a savant, or ride to clue 11 and scrape out 100 points.",
    ],
    howToPlay: [
      "Read clue 1, a one word vibe for the mystery school.",
      "Type a guess anytime. The school name, a nickname, or the mascot all count.",
      "A wrong guess or a Skip reveals the next clue. There are 11 in all, then the answer.",
      "Points drop as clues stack: 1200 on clue 1, 1000 on clue 2, then 100 less per clue down to 100.",
      "Pick Daily, Unlimited with a streak counter, or Conference mode, and set Easy (Power 4) or Hard (all of Division 1).",
    ],
    rules: [
      "The 11 clues follow a fixed order, from vibe and region through conference and sports history to the school colors.",
      "A wrong guess costs the same as a skip, one clue. A wrong guess on clue 11 ends the run.",
      "The daily school comes from the Power 4 pool and flips at midnight Eastern.",
      "Unlimited streaks earn badges at 3, 5, and 10 straight.",
    ],
    example: [
      "You skip the early clues. Clue 5 says SEC, so you swing on Georgia. Red. Clue 6 is basketball history, skip. Then clue 7 mentions a perfect national championship season in 2019 and it clicks: LSU.",
      "The card flips: 500 points for solving on clue 7, plus a fun fact about the school. Not the hero guess, but a clean save.",
    ],
    tips: [
      "Never skip when you have a hunch. A guess costs the same clue and might just be right.",
      "Clue 5, the conference, is the pivot. Run the whole league in your head before the points drop again.",
      "Still alive at clue 11? Colors settle it. Crimson and cream is not scarlet and gray.",
    ],
    faqs: [
      {
        q: "What is the difference between Easy and Hard?",
        a: "Easy sticks to Power 4 schools; Hard opens all of Division 1 for Unlimited and Conference play. The daily always uses Power 4.",
      },
      {
        q: "Does a wrong guess hurt more than skipping?",
        a: "No. Either way you move one clue down the point ladder.",
      },
      {
        q: "When does the daily school change?",
        a: "At midnight Eastern, and everyone gets the same school. Progress is saved in your browser, so you can finish later that day.",
      },
    ],
  },

  '/guess-cbb-team': {
    intro: [
      "One college basketball program is hiding behind six locked clues, and the points shrink with every clue you need. Solve it off the vibe word for 1000, or limp home at the mascot clue for 100.",
      "The pool spans blue bloods like Duke, Kentucky, and Kansas and mid-major regulars like Gonzaga, so do not assume a power conference. Play the shared daily or keep pulling programs in unlimited.",
    ],
    howToPlay: [
      "Start with clue 1, a single vibe word for the program.",
      "Type a guess. Autocomplete pulls from the full program list, and common short names count.",
      "Every wrong guess unlocks the next clue: region and state, conference, tournament history, championships, then the mascot.",
      "Guess sooner for more points, from 1000 on clue 1 down to 100 on clue 6.",
      "Pick Daily Challenge for the shared puzzle or Unlimited for a random program every time.",
    ],
    rules: [
      "There are 6 clues, worth 1000, 800, 600, 400, 200, and 100 points in order.",
      "Each wrong guess reveals the next clue, so you get at most 6 guesses. A wrong answer on clue 6 ends the game.",
      "Give Up shows the answer and scores zero.",
      "A new daily puzzle arrives every day, the same for everyone.",
    ],
    example: [
      "Clue 1 hands you a vibe word that could mean anything, so you fire a guess to open the region clue. It points to the plains. Kansas State feels right. Wrong, and clue 3 says Big 12. Baylor. Wrong again, so you spend one more miss on Texas Tech.",
      "That unlocks clue 5, championships, and it mentions four national titles. There is the fingerprint: Kansas. Correct on clue 5 banks 200 points, and the mascot clue never gets used.",
    ],
    tips: [
      "There is no skip button. A wrong guess is the only key to the next clue, so make every guess a real one.",
      "Championship counts are fingerprints. Few programs share the same number of banners.",
      "When the conference clue lands, recite that league's heavyweights before you type.",
    ],
    faqs: [
      {
        q: "How many guesses do I get?",
        a: "Up to 6, one per clue. Guess right at any point and you score whatever that clue is worth.",
      },
      {
        q: "Is the daily the same for everyone?",
        a: "Yes, one shared program per day, so scores compare fairly. Unlimited deals random programs for practice.",
      },
      {
        q: "What kinds of programs show up?",
        a: "Programs with real basketball pedigree, from championship blue bloods to mid-majors with March credentials.",
      },
    ],
  },

  '/cfb-higher-lower': {
    intro: [
      "Two quarterbacks, one question: who threw for more career passing yards in college? Not the NFL, college. That flip is the whole game, because the record books belong to four-year starters in pass-happy systems, not the legends you watched on Sundays.",
      "Tom Brady left Michigan with 4,773 yards. Case Keenum left Houston with 19,217, the record. Every pair is a little logic puzzle about eras, offenses, and who actually held the job.",
    ],
    howToPlay: [
      "Look at the two quarterbacks, their schools, and the years they played.",
      "Tap the one you think threw for more career college passing yards.",
      "Both totals flash for a couple of seconds, then the next pair loads.",
      "Play all 10 rounds and protect your streak for bonus points.",
      "Daily gives everyone the same 10 pairs. Unlimited deals random pairs; its Hard toggle picks close-gap pairs.",
    ],
    rules: [
      "10 rounds, 10 points per correct answer.",
      "Streaks pay a growing bonus: the second straight correct adds 5 extra, the third 10, the fourth 15, and so on. A miss resets the ladder.",
      "A perfect 10 for 10 scores 325, the max.",
      "Ties count as correct no matter which side you pick.",
      "The daily set flips at midnight Eastern. Hard mode lives in Unlimited only.",
    ],
    example: [
      "Round 1 pairs Tom Brady with Case Keenum and you refuse the bait: 19,217 buries 4,773. The next three land too, worth 15, 20, and 25 as the streak grows.",
      "Round 5 is two system guys you cannot separate, and the coin flip misses. Ladder reset. You grind out four of the last five and finish 8 of 10 for 140 points.",
    ],
    tips: [
      "Length of career beats fame. A four-year starter in an air raid out-throws a two-year phenom nearly every time.",
      "Check the years. Passing totals ballooned through the 2000s and 2010s, so an older great can trail a modern system guy.",
      "NFL resumes are traps. Plenty of famous pros sat early, split snaps, or ran the ball in college.",
    ],
    faqs: [
      {
        q: "What happens on a tie?",
        a: "You get credit either way, whichever side you picked.",
      },
      {
        q: "How does the streak bonus work?",
        a: "Each correct answer is 10 points. Consecutive correct answers add a bonus that grows by 5 each step, so one long run beats scattered singles. A perfect game hits 325.",
      },
      {
        q: "Are the passing yard totals real?",
        a: "Yes, career college passing yards under the official NCAA counting convention, which is why some famous names look small.",
      },
    ],
  },

  '/cfb-dynasty': {
    intro: [
      "CFB Dynasty hands you a real college football program and an open-ended job: win now, recruit forever, stack championships. The 44 schools are real. The players are not: every athlete is a generated recruit with a class year, so rosters age and churn.",
      "Each season runs into conference championships and the 12-team Playoff, then an NIL and portal offseason before you run it back.",
    ],
    howToPlay: [
      "Pick a program. Its prestige rating drives your talent pipeline and NIL budget.",
      "Play one week at a time: 12 games, weeks 1 to 4 out of conference, the rest in it.",
      "Finish top two in your conference to reach its title game; win it for an automatic Playoff bid.",
      "Survive the 12-team bracket, single elimination from the first round to the national championship.",
      "Spend NIL points across an 18-player high school board and an 8-player portal, then start the next season.",
    ],
    rules: [
      "The Playoff field is 12: the 5 conference champions plus 7 at-larges, seeded by ranking, byes for the top four.",
      "High school grades carry scouting error of up to 4 points either way. Portal transfers show true ratings and arrive as sophomores.",
      "NIL resets each offseason from prestige plus wins, and every signing spends against it.",
      "Seniors graduate and juniors rated 88 or higher often declare early.",
    ],
    example: [
      "You take Boise State, prestige 78. One September loss, then you run the league, finish 11-1, and win the conference title game for the automatic bid.",
      "You win a first-round game, stun a bye team in the quarterfinals, and lose the semifinal. Then your 89-rated junior quarterback declares, so you sign a portal passer rated exactly 81 and roll the dice on a 5-star scouted at 83 who might really be a 79. Or an 87.",
    ],
    tips: [
      "Shop the portal for needs, the high school board for ceilings. Transfers are exactly as rated; freshmen develop longest.",
      "Never enter a season without a real quarterback; the sim weighs your starter heavily.",
      "Recruit to the holes. The offseason notes list who graduated and who declared.",
    ],
    faqs: [
      {
        q: "Are the players real athletes?",
        a: "No. Schools and format are real; every player is fictional.",
      },
      {
        q: "Does my dynasty save?",
        a: "Yes, automatically, in your browser, one slot. The fire yourself button wipes it for good.",
      },
      {
        q: "Can a Group of Five team win it all?",
        a: "Yes. Its champion is one of the 5 automatic qualifiers, and single elimination does not care about prestige.",
      },
    ],
  },

  '/cbb-dynasty': {
    intro: [
      "CBB Dynasty is the college hoops program sim: 40 real schools, six leagues, fictional players, and a season built to set up March. You can have the best roster in the country and still lose everything in one bad night.",
      "Six leagues cover the sport, from the ACC and Big East to a Mid-Major group built for Cinderella runs. The one-and-done era means your best freshman is probably a rental.",
    ],
    howToPlay: [
      "Pick one of 40 programs. Prestige sets your pipeline and NIL power.",
      "Play 10 rounds of two games each, one league matchup and one cross-country test.",
      "Finish top four in your league for the conference tournament; win it and you dance automatically.",
      "Survive March: 32 teams, single elimination, five rounds from the Round of 32 to the title game.",
      "Recruit each spring from a 14-player high school board and a 7-player portal, then run it back.",
    ],
    rules: [
      "The field is 32 teams: six tournament champions plus 26 at-larges, seeded 1 through 32 by record first, strength second.",
      "Freshmen rated 88 or higher go one-and-done almost every time, upperclassmen rated 90 or higher often declare, and seniors graduate.",
      "High school grades can be off by up to 4 points either way; portal players show true ratings and arrive as sophomores.",
      "A Cinderella flag fires when a 10 seed or worse crashes the Final Four. Saves are automatic in your browser.",
    ],
    example: [
      "You take VCU, prestige 79. The season is bumpy, but you sneak into the league's top four, win both tournament games, and grab the automatic bid.",
      "March seeds you 13th. You win a nervy opener, shock a top-four seed in the Sweet 16, and crash the Final Four, earning the Cinderella tag. The semifinal ends it. Then your 90-rated sophomore declares, and NIL has to rebuild half a rotation.",
    ],
    tips: [
      "Sign the 88-plus freshman anyway. One superstar season is how March gets survived; just plan the replacement early.",
      "Your top five carries three quarters of team strength, so stack the starting lineup first.",
      "Mid-major life runs through the league tournament: win it and at-large math never matters.",
    ],
    faqs: [
      {
        q: "Are these real players?",
        a: "No. The programs are real, the players fictional.",
      },
      {
        q: "What counts as a Cinderella?",
        a: "A 10 seed or worse in the Final Four. The recap calls it out by seed and school.",
      },
      {
        q: "Can I miss March entirely?",
        a: "Yes. Only 32 of 40 make the field, and the recap will read Missed the field.",
      },
    ],
  },
};
