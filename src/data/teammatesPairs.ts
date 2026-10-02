import { TeammatesPair } from '@/types/teammates';

/* Every row is generated from scripts/data/teammatesVerified2026-10.json, which
   holds two sources on two hosts for every player and every claim in a funFact.
   Edit the record, never this file: scripts/simTeammatesRecord.mjs fails when
   the two disagree. */
export const teammatesPairs: TeammatesPair[] = [
  // EASY (difficulty 1), obvious pairings
  { player1: "LeBron James", player2: "Dwyane Wade", sport: "NBA", answer: true, funFact: "Heat teammates for four seasons, 2010-11 through 2013-14, and Wade joined LeBron again in Cleveland for part of 2017-18.", difficulty: 1 },
  { player1: "Tom Brady", player2: "Rob Gronkowski", sport: "NFL", answer: true, funFact: "Patriots teammates through 2018, then together again on the Buccaneers in 2020 and 2021.", difficulty: 1 },
  { player1: "Stephen Curry", player2: "Kevin Durant", sport: "NBA", answer: true, funFact: "Warriors teammates for three seasons, 2016-17 through 2018-19.", difficulty: 1 },
  { player1: "Peyton Manning", player2: "Aaron Rodgers", sport: "NFL", answer: false, funFact: "Never on the same team. Manning played for the Colts and the Broncos, Rodgers for the Packers, the Jets and the Steelers.", difficulty: 1 },
  { player1: "Patrick Mahomes", player2: "Travis Kelce", sport: "NFL", answer: true, funFact: "Chiefs teammates from 2017, Mahomes' first season in the league.", difficulty: 1 },
  { player1: "Kobe Bryant", player2: "Shaquille O'Neal", sport: "NBA", answer: true, funFact: "Lakers teammates for eight seasons, 1996-97 through 2003-04.", difficulty: 1 },
  { player1: "Michael Jordan", player2: "Scottie Pippen", sport: "NBA", answer: true, funFact: "Bulls teammates from 1987-88 through 1997-98, apart from 1993-94. Jordan sat that season out.", difficulty: 1 },
  { player1: "Luka Dončić", player2: "Anthony Davis", sport: "NBA", answer: false, funFact: "They were traded for each other. The February 2025 deal sent Dončić to the Lakers and Davis to the Mavericks, so they were never on the same roster.", difficulty: 1 },
  { player1: "Jimmy Butler", player2: "Stephen Curry", sport: "NBA", answer: true, funFact: "Butler came over from the Heat during 2024-25 and was still a Warrior in 2025-26.", difficulty: 1 },
  { player1: "Lionel Messi", player2: "Neymar", sport: "Soccer", answer: true, funFact: "Both played for Barcelona (2013-2017) and Paris Saint-Germain (2021-2023).", difficulty: 1 },
  { player1: "Cristiano Ronaldo", player2: "Lionel Messi", sport: "Soccer", answer: false, funFact: "Despite being the greatest rivals, they never played on the same club team.", difficulty: 1 },
  { player1: "Zlatan Ibrahimovic", player2: "Cristiano Ronaldo", sport: "Soccer", answer: false, funFact: "Never club teammates. Zlatan's Manchester United spell, 2016 to 2018, fell between Ronaldo's two, 2003 to 2009 and from 2021.", difficulty: 1 },

  // MEDIUM (difficulty 2), less obvious
  { player1: "LeBron James", player2: "Shaquille O'Neal", sport: "NBA", answer: true, funFact: "Cavaliers teammates for one season, 2009-10.", difficulty: 2 },
  { player1: "Russell Wilson", player2: "Peyton Manning", sport: "NFL", answer: false, funFact: "Never teammates, though both were Broncos: Manning from 2012 to 2015, Wilson in 2022 and 2023.", difficulty: 2 },
  { player1: "Derrick Henry", player2: "Lamar Jackson", sport: "NFL", answer: true, funFact: "Ravens teammates from 2024, the year Henry arrived after eight seasons with the Titans.", difficulty: 2 },
  { player1: "Kevin Garnett", player2: "Ray Allen", sport: "NBA", answer: true, funFact: "Celtics teammates for five seasons, 2007-08 through 2011-12.", difficulty: 2 },
  { player1: "Odell Beckham Jr.", player2: "Baker Mayfield", sport: "NFL", answer: true, funFact: "Browns teammates from 2019 until Beckham left during the 2021 season.", difficulty: 2 },
  { player1: "James Harden", player2: "Kevin Durant", sport: "NBA", answer: true, funFact: "Thunder teammates from 2009-10 through 2011-12, then together again on the Nets in 2020-21 and 2021-22.", difficulty: 2 },
  { player1: "Saquon Barkley", player2: "Jalen Hurts", sport: "NFL", answer: true, funFact: "Eagles teammates from 2024, when Barkley came over from the Giants.", difficulty: 2 },
  { player1: "Davante Adams", player2: "Aaron Rodgers", sport: "NFL", answer: true, funFact: "Packers teammates from 2014 through 2021, then reunited on the Jets in 2024.", difficulty: 2 },
  { player1: "David Beckham", player2: "Zlatan Ibrahimovic", sport: "Soccer", answer: true, funFact: "Both played for PSG during the 2012-2013 season.", difficulty: 2 },
  { player1: "Thierry Henry", player2: "Lionel Messi", sport: "Soccer", answer: true, funFact: "Both played for Barcelona from 2007-2010, with Henry providing assists for a young Messi.", difficulty: 2 },
  { player1: "Wayne Rooney", player2: "Robin van Persie", sport: "Soccer", answer: true, funFact: "Both played for Manchester United from 2012-2015, winning the Premier League in 2013.", difficulty: 2 },
  { player1: "Sergio Ramos", player2: "Lionel Messi", sport: "Soccer", answer: true, funFact: "Despite years as El Clásico rivals, they became PSG teammates in 2021-2023.", difficulty: 2 },

  // HARD (difficulty 3), obscure overlaps and tricky false ones
  { player1: "Randy Moss", player2: "Tom Brady", sport: "NFL", answer: true, funFact: "Patriots teammates from 2007 until Moss left during the 2010 season.", difficulty: 3 },
  { player1: "Carmelo Anthony", player2: "LeBron James", sport: "NBA", answer: true, funFact: "Lakers teammates for one season, 2021-22. Both had come into the league in 2003-04.", difficulty: 3 },
  { player1: "Kyrie Irving", player2: "Luka Dončić", sport: "NBA", answer: true, funFact: "Mavericks teammates from Irving's arrival during 2022-23 until Dončić left during 2024-25.", difficulty: 3 },
  { player1: "J.J. Watt", player2: "DeAndre Hopkins", sport: "NFL", answer: true, funFact: "Texans teammates from 2013 through 2019, and together again on the Cardinals in 2021 and 2022.", difficulty: 3 },
  { player1: "Tim Duncan", player2: "LeBron James", sport: "NBA", answer: false, funFact: "Never teammates. Duncan played his whole career for the Spurs, 1997-98 through 2015-16, and LeBron never wore a Spurs jersey.", difficulty: 3 },
  { player1: "Von Miller", player2: "Odell Beckham Jr.", sport: "NFL", answer: true, funFact: "Both joined the Rams during the 2021 season and both played in the Super Bowl LVI win over the Bengals.", difficulty: 3 },
  { player1: "Russell Westbrook", player2: "LeBron James", sport: "NBA", answer: true, funFact: "Lakers teammates in 2021-22 and for part of 2022-23, until Westbrook left during that season.", difficulty: 3 },
  { player1: "Cam Newton", player2: "Patrick Mahomes", sport: "NFL", answer: false, funFact: "Never teammates. Newton played for the Panthers and the Patriots, and Mahomes has only ever been a Chief.", difficulty: 3 },
  { player1: "Anthony Davis", player2: "DeMarcus Cousins", sport: "NBA", answer: true, funFact: "Pelicans teammates in 2016-17, after Cousins arrived during the season, and in 2017-18.", difficulty: 3 },
  { player1: "Julio Jones", player2: "Derrick Henry", sport: "NFL", answer: true, funFact: "Titans teammates for one season, 2021, after Jones' ten years in Atlanta.", difficulty: 3 },
  { player1: "Giannis Antetokounmpo", player2: "Stephen Curry", sport: "NBA", answer: false, funFact: "Never teammates. Through 2025-26 Giannis had only played for the Bucks and Curry only for the Warriors.", difficulty: 3 },
  { player1: "Luka Dončić", player2: "LeBron James", sport: "NBA", answer: true, funFact: "Lakers teammates from 2024-25, when Dončić arrived from Dallas in the middle of the season.", difficulty: 3 },
  { player1: "Jimmy Butler", player2: "Draymond Green", sport: "NBA", answer: true, funFact: "Warriors teammates from 2024-25, when Butler arrived from Miami in the middle of the season.", difficulty: 3 },
  { player1: "Nikola Jokić", player2: "LeBron James", sport: "NBA", answer: false, funFact: "Never teammates. Through 2025-26 Jokić had only played for the Nuggets, and LeBron never wore a Denver jersey.", difficulty: 3 },
  { player1: "Josh Allen", player2: "Stefon Diggs", sport: "NFL", answer: true, funFact: "Bills teammates for four seasons, 2020 through 2023, before Diggs moved on to Houston.", difficulty: 3 },
  { player1: "Caleb Williams", player2: "D.J. Moore", sport: "NFL", answer: true, funFact: "Bears teammates in 2024 and 2025, Williams' first two seasons in the league.", difficulty: 3 },
  { player1: "Victor Wembanyama", player2: "Chris Paul", sport: "NBA", answer: true, funFact: "Spurs teammates for one season, 2024-25, Wembanyama's second in the league.", difficulty: 3 },
  { player1: "Andrea Pirlo", player2: "David Villa", sport: "Soccer", answer: true, funFact: "Both played for New York City FC in MLS: Pirlo from 2015-2017 and Villa from 2014-2018.", difficulty: 3 },
  { player1: "Frank Lampard", player2: "Andrea Pirlo", sport: "Soccer", answer: true, funFact: "Both played in MLS: Lampard at NYCFC and Pirlo at NYCFC, they were teammates from 2015-2016!", difficulty: 3 },
  { player1: "Ronaldinho", player2: "Cristiano Ronaldo", sport: "Soccer", answer: false, funFact: "They never played together: Ronaldinho left Barcelona in 2008, while Ronaldo was at Manchester United.", difficulty: 3 },
  { player1: "Robert Lewandowski", player2: "Pierre-Emerick Aubameyang", sport: "Soccer", answer: true, funFact: "Both played for Borussia Dortmund from 2013-2014 before Lewandowski left for Bayern Munich.", difficulty: 3 },
  { player1: "Kylian Mbappé", player2: "Neymar", sport: "Soccer", answer: true, funFact: "Both played for Paris Saint-Germain from 2017-2023.", difficulty: 3 },
  { player1: "Eden Hazard", player2: "Kevin De Bruyne", sport: "Soccer", answer: true, funFact: "Both were at Chelsea briefly in 2012-2014, though De Bruyne was mostly on loan.", difficulty: 3 },
  { player1: "Karim Benzema", player2: "Cristiano Ronaldo", sport: "Soccer", answer: true, funFact: "Both played for Real Madrid from 2009-2018, winning four Champions League titles together.", difficulty: 3 },
  { player1: "Kylian Mbappé", player2: "Vinícius Jr.", sport: "Soccer", answer: true, funFact: "Both became Real Madrid teammates when Mbappé joined on a free transfer in 2024.", difficulty: 3 },
  { player1: "Jude Bellingham", player2: "Erling Haaland", sport: "Soccer", answer: true, funFact: "Both played together at Borussia Dortmund from 2020-2022 before taking different paths to Spain and England.", difficulty: 3 },
];
