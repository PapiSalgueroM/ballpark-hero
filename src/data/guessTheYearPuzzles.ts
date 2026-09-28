import { YearPuzzle } from '@/types/guessTheYear';
import { getTodayET } from '@/lib/dateUtils';

/**
 * Guess the Year, the clue sets.
 *
 * Round 661 (2026-09-28). A check of all 300 clues found 38 that pointed at
 * the wrong year, fitted two puzzle years, or stated something false, and many
 * more that no page opened could stand behind: Brady's Tampa Bay title sat in 2020
 * when the game was in February 2021, the Chiefs were credited with a three-peat
 * they lost to the Eagles, Seattle's February 2026 Super Bowl sat in 2025, and
 * three Heisman clues were a year early. Every clue now matches its entry in
 * scripts/data/triviaFactsVerified2026-09.json word for word, each entry carries
 * two sources on two hosts, and scripts/simTriviaFacts.mjs fails if the two
 * disagree or a year loses its sixth clue.
 *
 * The convention is the calendar year the event happened in, so a Super Bowl or
 * a bowl game played in January belongs to the new year, not the season before.
 *
 * The array length and order are load bearing: the daily puzzle is picked by
 * day count modulo the length, so edit clues in place and keep six per year.
 */
export const guessTheYearPuzzles: YearPuzzle[] = [
  {
    year: 1998,
    clues: [
      "The Detroit Red Wings won a second straight Stanley Cup",
      "A slugger shattered a 37-year-old single season home run record",
      "The host nation won its first ever FIFA World Cup",
      "A legendary shooting guard won his sixth NBA Finals MVP",
      "A Texas running back won the Heisman Trophy",
      "France defeated Brazil 3-0 in the World Cup Final"
    ]
  },
  {
    year: 2004,
    clues: [
      "A hockey lockout began that would cancel an entire NHL season",
      "A curse was broken in Boston after 86 years",
      "Greece shocked the world by winning a major international soccer tournament",
      "A basketball team lost in the Olympics despite having LeBron, Carmelo, and Wade",
      "USC's Matt Leinart won the Heisman Trophy",
      "The Red Sox won their first World Series since 1918"
    ]
  },
  {
    year: 2016,
    clues: [
      "A UFC champion lost her title via submission at UFC 196",
      "A team came back from 3-1 in the NBA Finals for the first time ever",
      "Portugal won their first major international soccer trophy",
      "The Cubs won the World Series for the first time in 108 years",
      "The Denver Broncos beat Carolina in Super Bowl 50",
      "Leicester City won the Premier League at 5000-1 odds"
    ]
  },
  {
    year: 2008,
    clues: [
      "A swimmer won 8 gold medals at a single Olympic Games",
      "The Detroit Lions became the first NFL team to go 0-16",
      "Spain won their first European Championship since 1964",
      "The Celtics beat the Lakers for their first NBA title in 22 years",
      "Sam Bradford won the Heisman at Oklahoma",
      "Michael Phelps set the record for most Olympic gold medals in a single Games in Beijing"
    ]
  },
  {
    year: 1994,
    clues: [
      "Baseball players went on strike, canceling the World Series",
      "Brazil won a record fourth World Cup",
      "The Rangers ended a 54-year Stanley Cup drought",
      "A former Heisman winner was famously chased in a white Ford Bronco",
      "The Dallas Cowboys beat the Buffalo Bills in a second straight Super Bowl",
      "Brazil won the World Cup in a penalty shootout against Italy at the Rose Bowl"
    ]
  },
  {
    year: 2020,
    clues: [
      "The NBA finished their season inside a 'bubble' in Orlando",
      "The Dodgers beat the Tampa Bay Rays in the World Series",
      "The UEFA Euros were postponed for an entire year",
      "The Lakers won their first championship in 10 years",
      "DeVonta Smith won the Heisman at Alabama",
      "Patrick Mahomes won Super Bowl MVP at 24 as the Chiefs beat the 49ers"
    ]
  },
  {
    year: 1986,
    clues: [
      "A 'Hand of God' goal became one of the most controversial in soccer history",
      "The Mets came back from a 2-run deficit in the 10th inning of Game 6",
      "Vinny Testaverde won the Heisman at Miami",
      "Mike Tyson became the youngest heavyweight champion at age 20",
      "Greg LeMond won the Tour de France",
      "Argentina won the World Cup led by Maradona's brilliance in Mexico"
    ]
  },
  {
    year: 2012,
    clues: [
      "A sprinter became the first man to retain both the 100m and 200m Olympic titles",
      "LeBron James won his first NBA title with the Miami Heat",
      "The Giants beat the Patriots in the Super Bowl for the second time in 4 years",
      "The Kings won their first Stanley Cup as the eighth seed in the West",
      "Johnny Manziel became the first freshman to win the Heisman",
      "Michael Phelps became the most decorated Olympian ever in London"
    ]
  },
  {
    year: 2000,
    clues: [
      "A running back scored 26 touchdowns and won NFL MVP",
      "The Yankees won their third consecutive World Series title",
      "France won the European Championship as reigning World Cup holders",
      "Venus Williams won both Wimbledon and the US Open",
      "Chris Weinke became the oldest Heisman winner at age 28",
      "The Lakers began their three-peat with Shaq winning Finals MVP"
    ]
  },
  {
    year: 1985,
    clues: [
      "An NFL team recorded a famous music video weeks before winning the Super Bowl",
      "A 17-year-old tennis prodigy won the Wimbledon men's title",
      "The Royals came back from 3-1 to beat the Cardinals in the World Series",
      "Edmonton won their second consecutive Stanley Cup with Gretzky",
      "Bo Jackson rushed for 1,786 yards in his Heisman campaign at Auburn",
      "The Chicago Bears went 15-1 behind their '46' defense"
    ]
  },
  {
    year: 2010,
    clues: [
      "Spain won their first ever FIFA World Cup",
      "Drew Brees led the Saints to their first Super Bowl victory",
      "LeBron James announced 'The Decision' on national television",
      "Cam Newton won the Heisman Trophy at Auburn",
      "The Blackhawks won their first Stanley Cup in 49 years",
      "Spain defeated Netherlands 1-0 in the World Cup Final in South Africa"
    ]
  },
  {
    year: 1996,
    clues: [
      "A gymnast landed a vault on an injured ankle to clinch team gold",
      "The Cowboys won their third Super Bowl in four years",
      "Evander Holyfield stopped Mike Tyson to win the WBA heavyweight title",
      "The Yankees won their first World Series since 1978",
      "Danny Wuerffel won the Heisman at Florida",
      "Muhammad Ali lit the Olympic cauldron in Atlanta"
    ]
  },
  {
    year: 2014,
    clues: [
      "A host nation lost 7-1 in a World Cup semifinal on home soil",
      "The Spurs beat the Heat 4-1 in an NBA Finals rematch",
      "Derek Jeter retired after 20 seasons with the Yankees",
      "The Seattle Seahawks crushed the Denver Broncos 43-8 in the Super Bowl",
      "Marcus Mariota won the Heisman at Oregon",
      "Germany crushed Brazil 7-1 in Belo Horizonte"
    ]
  },
  {
    year: 1992,
    clues: [
      "A 'Dream Team' dominated Olympic basketball like never before",
      "Evander Holyfield lost the undisputed heavyweight title to Riddick Bowe",
      "The Blue Jays became the first team outside the US to win the World Series",
      "The Pittsburgh Penguins won back-to-back Stanley Cups for the first time",
      "Gino Torretta won the Heisman at Miami",
      "Michael Jordan won his second straight NBA Finals MVP"
    ]
  },
  {
    year: 2022,
    clues: [
      "A legendary quarterback retired, unretired, then retired again the next year",
      "Argentina won the World Cup for the first time in 36 years",
      "The Warriors won their fourth NBA title in eight years",
      "Georgia won the College Football Playoff, their first title since 1980",
      "Caleb Williams won the Heisman at USC",
      "Messi finally won the World Cup, beating France on penalties in the final"
    ]
  },
  {
    year: 2006,
    clues: [
      "A French legend headbutted an Italian defender in the World Cup Final",
      "The Cardinals won the World Series with 83 regular season wins",
      "The Steelers won the Super Bowl behind a record-setting 75-yard run",
      "Miami won the title with Dwyane Wade winning Finals MVP",
      "Troy Smith won the Heisman at Ohio State",
      "Italy won the World Cup on penalties after Zidane's infamous red card"
    ]
  },
  {
    year: 1990,
    clues: [
      "West Germany won the World Cup final in Rome with a late penalty",
      "The Cincinnati Reds swept the Oakland A's in the World Series",
      "UNLV dominated the NCAA Tournament, winning by 30 in the final",
      "Ty Detmer won the Heisman at BYU",
      "Joe Montana won Super Bowl MVP in a 55-10 rout",
      "Buster Douglas knocked out Mike Tyson in Tokyo"
    ]
  },
  {
    year: 2018,
    clues: [
      "A 19-year-old became the second teenager to score in a World Cup Final",
      "The Eagles won their first Super Bowl with a backup quarterback",
      "The Capitals won their first Stanley Cup in franchise history",
      "Kyler Murray won the Heisman at Oklahoma",
      "LeBron joined the Lakers in free agency",
      "France won the World Cup in Russia, defeating Croatia 4-2 in the Final"
    ]
  },
  {
    year: 2002,
    clues: [
      "Brazil won their fifth World Cup with Ronaldo scoring twice in the final",
      "The Patriots won their first Super Bowl with a game-winning field goal",
      "The Angels won their first and only World Series title",
      "Carson Palmer won the Heisman at USC",
      "The Lakers completed their three-peat",
      "Brazil defeated Germany 2-0 in the World Cup Final in Japan"
    ]
  },
  {
    year: 1984,
    clues: [
      "A running back set the single-season record with 2,105 rushing yards",
      "The Soviet Union boycotted the Summer Olympics in Los Angeles",
      "The Cubs made the playoffs for the first time since 1945",
      "Doug Flutie threw the famous 'Hail Flutie' pass for Boston College",
      "Carl Lewis won 4 gold medals at the LA Olympics",
      "Miami won the national championship behind Bernie Kosar"
    ]
  },
  // NEW, 2024 and 2025 puzzles
  {
    year: 2024,
    clues: [
      "A French swimmer won 4 individual gold medals at his home Olympics in Paris",
      "The Chiefs beat the 49ers in overtime to win back-to-back Super Bowls (LVIII)",
      "Caitlin Clark shattered NCAA scoring records and was drafted #1 in the WNBA",
      "Real Madrid signed Kylian Mbappé on a free transfer from PSG",
      "The Dodgers won the World Series with Shohei Ohtani in his first NL season",
      "Novak Djokovic won his first Olympic gold at age 37 in Paris"
    ]
  },
  {
    year: 2025,
    clues: [
      "Alexander Ovechkin broke Wayne Gretzky's all-time NHL goal record",
      "The Florida Panthers won a second straight Stanley Cup",
      "A generational NBA trade sent Luka Dončić to the Los Angeles Lakers",
      "The Dodgers won back-to-back World Series",
      "The Oklahoma City Thunder won their first NBA Championship",
      "The Philadelphia Eagles won the Super Bowl, beating the Kansas City Chiefs"
    ]
  },
  {
    year: 1972,
    clues: [
      "Bobby Fischer beat Boris Spassky in a Cold War chess showdown",
      "A massacre of Israeli athletes overshadowed the Munich Summer Olympics",
      "The Soviet Union beat the United States in a disputed Olympic basketball final",
      "Mark Spitz won seven gold medals in the pool at one Olympics",
      "The Miami Dolphins went undefeated through the regular season",
      "The Munich Olympics were held in West Germany"
    ]
  },
  {
    year: 1973,
    clues: [
      "George Foreman knocked out Joe Frazier to win the heavyweight title",
      "The New York Knicks won the NBA title",
      "The Oakland Athletics won a second straight World Series",
      "Secretariat won horse racing's Triple Crown with a 31-length Belmont",
      "The Miami Dolphins capped their perfect season by winning the Super Bowl",
      "Billie Jean King beat Bobby Riggs in the 'Battle of the Sexes'"
    ]
  },
  {
    year: 1976,
    clues: [
      "The Boston Celtics won the NBA title in a Finals that featured a triple-overtime game",
      "The Pittsburgh Steelers won a second straight Super Bowl",
      "Bruce Jenner won the Olympic decathlon",
      "The Cincinnati Reds swept the Yankees for a second straight World Series",
      "The Summer Olympics were held in Montreal",
      "Nadia Comaneci scored the first perfect 10 in Olympic gymnastics"
    ]
  },
  {
    year: 1979,
    clues: [
      "The Seattle SuperSonics won their only NBA championship",
      "The Pittsburgh Steelers won their third Super Bowl",
      "The Montreal Canadiens won a fourth straight Stanley Cup",
      "The Pittsburgh Pirates came back from 3-1 down to win the World Series",
      "Bjorn Borg won another Wimbledon title",
      "Magic Johnson's Michigan State beat Larry Bird's Indiana State for the NCAA title"
    ]
  },
  {
    year: 1980,
    clues: [
      "Boxer Roberto Duran quit on Sugar Ray Leonard in the 'No Mas' fight",
      "Bjorn Borg won his fifth straight Wimbledon title",
      "The Philadelphia Phillies won their first-ever World Series",
      "Eric Heiden won five individual speed skating golds at the Winter Olympics",
      "Many nations boycotted the Summer Olympics in Moscow",
      "The US hockey team beat the USSR in the 'Miracle on Ice' at Lake Placid"
    ]
  },
  {
    year: 1981,
    clues: [
      "A baseball season was interrupted by a midseason players' strike",
      "John McEnroe ended Bjorn Borg's Wimbledon reign",
      "The Boston Celtics beat the Houston Rockets for the NBA title",
      "Sugar Ray Leonard beat Thomas Hearns in a welterweight showdown",
      "The Oakland Raiders won the Super Bowl as a wild card team",
      "The Los Angeles Dodgers beat the Yankees to win the World Series"
    ]
  },
  {
    year: 1982,
    clues: [
      "Wayne Gretzky scored a record 92 goals in an NHL season",
      "The New York Islanders won a third straight Stanley Cup",
      "The St. Louis Cardinals won the World Series",
      "The Los Angeles Lakers won the NBA title behind Magic Johnson",
      "The San Francisco 49ers won their first Super Bowl",
      "Italy won the FIFA World Cup in Spain as Paolo Rossi starred"
    ]
  },
  {
    year: 1983,
    clues: [
      "Australia II ended the New York Yacht Club's 132-year hold on the America's Cup",
      "Carl Lewis starred at the first World Athletics Championships in Helsinki",
      "The Baltimore Orioles won the World Series",
      "The Washington Redskins won their first Super Bowl",
      "NC State pulled a stunning upset to win the NCAA basketball title",
      "The Philadelphia 76ers swept to the NBA title behind Moses Malone"
    ]
  },
  {
    year: 1987,
    clues: [
      "Sugar Ray Leonard beat Marvin Hagler in a split decision",
      "The Edmonton Oilers won another Stanley Cup with Wayne Gretzky",
      "Mike Tyson unified the heavyweight titles",
      "The New York Giants won their first Super Bowl behind Phil Simms",
      "Magic Johnson won Finals MVP as the Lakers beat the Celtics",
      "The Minnesota Twins beat the St. Louis Cardinals in seven games"
    ]
  },
  {
    year: 1988,
    clues: [
      "The 'Battle of the Carmens' took place at the Calgary Winter Olympics",
      "Steffi Graf completed the 'Golden Slam' in tennis",
      "Mike Tyson knocked out Michael Spinks in 91 seconds",
      "Kirk Gibson hit a famous pinch-hit walk-off homer in the World Series opener",
      "Ben Johnson was stripped of his Olympic 100m gold for doping in Seoul",
      "The Los Angeles Dodgers beat the Oakland A's in five games"
    ]
  },
  {
    year: 1989,
    clues: [
      "Michael Jordan hit 'The Shot' over Craig Ehlo in the playoffs",
      "Pete Rose was banned from baseball for gambling",
      "The Detroit Pistons swept the Lakers for their first NBA title",
      "The San Francisco 49ers beat the Bengals 20-16 in the Super Bowl",
      "An earthquake interrupted the World Series in the Bay Area",
      "The Oakland Athletics swept the San Francisco Giants in the World Series"
    ]
  },
  {
    year: 1991,
    clues: [
      "Carl Lewis set a 100m world record of 9.86 at the World Championships in Tokyo",
      "Magic Johnson announced he was HIV-positive and retired",
      "Duke ended UNLV's unbeaten run and won its first NCAA basketball title",
      "The New York Giants beat the Buffalo Bills by one point in the Super Bowl",
      "Michael Jordan won his first NBA title and Finals MVP",
      "The Minnesota Twins beat the Atlanta Braves in a classic seven-game World Series"
    ]
  },
  {
    year: 1993,
    clues: [
      "Monica Seles was stabbed by a spectator during a match",
      "Don Shula became the winningest coach in NFL history",
      "The Montreal Canadiens won the Stanley Cup",
      "The Dallas Cowboys won the Super Bowl over the Buffalo Bills",
      "Michael Jordan completed his first 'three-peat' with the Bulls",
      "The Toronto Blue Jays won the World Series on Joe Carter's walk-off home run"
    ]
  },
  {
    year: 1995,
    clues: [
      "Major League Baseball returned after a strike wiped out the previous World Series",
      "The Houston Rockets repeated as NBA champions, sweeping the Magic",
      "The San Francisco 49ers became the first team to win five Super Bowls",
      "Cal Ripken Jr. broke Lou Gehrig's consecutive games streak",
      "Jonah Lomu starred as rugby's World Cup was hosted by South Africa",
      "The Braves won their first World Series since moving to Atlanta"
    ]
  },
  {
    year: 1997,
    clues: [
      "Martina Hingis became the youngest Grand Slam singles champion of the Open Era",
      "Mike Tyson was disqualified for biting Evander Holyfield's ear",
      "Michael Jordan's 'Flu Game' helped the Bulls in the Finals",
      "The Green Bay Packers won their first NFL title in 29 years",
      "The Florida Marlins won the World Series in just their fifth season",
      "Tiger Woods won his first Masters by a record 12 strokes"
    ]
  },
  {
    year: 1999,
    clues: [
      "Wayne Gretzky played his final NHL game and retired",
      "The San Antonio Spurs beat the Knicks for their first NBA title",
      "The Denver Broncos won a second straight Super Bowl in John Elway's final season",
      "Manchester United completed a treble with a stoppage-time comeback against Bayern Munich",
      "The New York Yankees swept the Braves to win another World Series",
      "The US women's soccer team won the World Cup as Brandi Chastain scored the winning penalty"
    ]
  },
  {
    year: 2001,
    clues: [
      "A running backhand flip by Derek Jeter helped the Yankees in the playoffs",
      "Michael Schumacher won another Formula 1 world championship with Ferrari",
      "The Baltimore Ravens routed the New York Giants 34-7 in the Super Bowl",
      "Tiger Woods held all four major golf titles at once (the 'Tiger Slam')",
      "Barry Bonds hit a single-season record 73 home runs",
      "The Arizona Diamondbacks beat the Yankees in a seven-game World Series"
    ]
  },
  {
    year: 2003,
    clues: [
      "LeBron James was drafted first overall by the Cleveland Cavaliers",
      "The New Jersey Devils won the Stanley Cup",
      "Serena Williams first held all four Grand Slam titles at once (the 'Serena Slam')",
      "The Tampa Bay Buccaneers won their first Super Bowl",
      "The San Antonio Spurs won their second NBA title behind Tim Duncan",
      "The Florida Marlins beat the Yankees in six games"
    ]
  },
  {
    year: 2005,
    clues: [
      "Danica Patrick led laps as a rookie at the Indianapolis 500",
      "Roger Federer won a third straight Wimbledon title",
      "The San Antonio Spurs won another NBA title over the Pistons",
      "The New England Patriots won their third Super Bowl in four years",
      "The Chicago White Sox won their first World Series since 1917",
      "Liverpool came back from 3-0 down to win the Champions League final in Istanbul"
    ]
  },
  {
    year: 2007,
    clues: [
      "Floyd Mayweather beat Oscar De La Hoya in a record-breaking bout",
      "Kimi Raikkonen won the Formula 1 title for Ferrari",
      "The Indianapolis Colts won the Super Bowl as Peyton Manning got his first ring",
      "The New England Patriots completed a 16-0 regular season",
      "Barry Bonds passed Hank Aaron as baseball's all-time home run king",
      "The Boston Red Sox swept the Rockies to win the World Series"
    ]
  },
  {
    year: 2009,
    clues: [
      "Barcelona won an unprecedented sextuple under Pep Guardiola",
      "Roger Federer surpassed Pete Sampras with his 15th Grand Slam title",
      "Kobe Bryant won his first Finals MVP as the Lakers beat Orlando",
      "The Pittsburgh Steelers won a record sixth Super Bowl on a late catch",
      "Usain Bolt set still-standing world records in the 100m and 200m in Berlin",
      "The New York Yankees beat the Phillies in the World Series"
    ]
  },
  {
    year: 2011,
    clues: [
      "The Boston Bruins won the Stanley Cup",
      "Novak Djokovic went 70-6 and won three Grand Slams in a dominant season",
      "The Green Bay Packers won the Super Bowl behind Aaron Rodgers",
      "Japan won the Women's World Cup months after a devastating earthquake",
      "Dirk Nowitzki led the Dallas Mavericks past the Miami Heat for the NBA title",
      "The St. Louis Cardinals beat the Texas Rangers in a seven-game World Series"
    ]
  },
  {
    year: 2013,
    clues: [
      "Bayern Munich won the Champions League in an all-German final",
      "Andy Murray became the first British man in 77 years to win Wimbledon",
      "The Chicago Blackhawks won their second Stanley Cup in four years",
      "The Baltimore Ravens won the Super Bowl in a game interrupted by a power outage",
      "The Boston Red Sox beat the Cardinals in six games",
      "The Miami Heat won a second straight title behind LeBron James and Ray Allen's clutch shot"
    ]
  },
  {
    year: 2015,
    clues: [
      "American Pharoah won horse racing's first Triple Crown in 37 years",
      "Serena Williams won the first three majors but fell short of a calendar Grand Slam",
      "The Golden State Warriors won their first NBA title in 40 years",
      "The Kansas City Royals won the World Series",
      "The New England Patriots won the Super Bowl on a last-minute goal-line interception",
      "The US women's soccer team won the World Cup as Carli Lloyd scored a hat trick"
    ]
  },
  {
    year: 2017,
    clues: [
      "Lewis Hamilton won another Formula 1 world championship",
      "Floyd Mayweather beat Conor McGregor in a crossover boxing match",
      "The Golden State Warriors won the title after adding Kevin Durant",
      "The Houston Astros won their first World Series",
      "Roger Federer and Rafael Nadal staged comeback Grand Slam seasons",
      "The New England Patriots came back from a 28-3 deficit to win the Super Bowl in overtime"
    ]
  },
  {
    year: 2019,
    clues: [
      "The St. Louis Blues won their first-ever Stanley Cup",
      "Liverpool won the Champions League in an all-English final",
      "The Toronto Raptors won their first NBA title behind Kawhi Leonard",
      "The US women's soccer team won back-to-back World Cups",
      "The Washington Nationals won their first World Series",
      "Tiger Woods won the Masters for his first major in 11 years"
    ]
  },
  {
    year: 2021,
    clues: [
      "Italy won the European Championship on penalties at Wembley",
      "Max Verstappen won his first Formula 1 title on the last lap of the final race",
      "The Milwaukee Bucks won the NBA title behind Giannis Antetokounmpo",
      "An Olympic Games postponed by a year was finally held in Tokyo",
      "The Atlanta Braves won the World Series",
      "The Tampa Bay Buccaneers won the Super Bowl at home as Tom Brady got a seventh ring"
    ]
  },
  {
    year: 2023,
    clues: [
      "Novak Djokovic won three majors to take the men's record to 24",
      "The Vegas Golden Knights won the Stanley Cup",
      "The Denver Nuggets won their first NBA title behind Nikola Jokic",
      "The Texas Rangers won their first World Series",
      "Manchester City completed the treble by winning the Champions League",
      "The Kansas City Chiefs won the Super Bowl as Patrick Mahomes won another MVP"
    ]
  }
];

export function getDailyGuessTheYearPuzzle(): YearPuzzle {
  // Round 52: anchor the day count to the ET calendar so the puzzle flips at
  // midnight Eastern for everyone, not at each browser's local midnight.
  const start = new Date('2024-01-01T12:00:00Z').getTime();
  const today = new Date(getTodayET() + 'T12:00:00Z').getTime();
  const daysDiff = Math.floor((today - start) / 86400000);
  const puzzleIndex = ((daysDiff % guessTheYearPuzzles.length) + guessTheYearPuzzles.length) % guessTheYearPuzzles.length;
  return guessTheYearPuzzles[puzzleIndex];
}
