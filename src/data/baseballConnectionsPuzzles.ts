export interface BaseballConnectionGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

export interface BaseballConnectionsPuzzle {
  id: string;
  groups: BaseballConnectionGroup[];
}

/**
 * Baseball Connections boards: the offline fallback, and the source the live
 * table baseball_connections_puzzles was seeded from (bconn-001 to 060).
 *
 * Round 1558 held every group to the record for the first time: the league's
 * own data service for each man (scripts/data/baseballConnectionsRecord-2026-10.json)
 * and, where it cannot say, a closed list from one documented page. Every
 * member must fit his group and no man from another group may fit it too,
 * because a guess is right only when the five tiles equal one stored group.
 * Thirty three boards were fixed in place (same id, same order): the early
 * sixteen were mostly false or had second answers, the later ones a few men
 * born elsewhere or listed at two positions. The two host proof of each fix
 * is scripts/data/baseballConnectionsVerified-2026-10.json, and
 * scripts/simUsConnectionsFacts.mjs fails the next one.
 */
export const baseballConnectionsPuzzles: BaseballConnectionsPuzzle[] = [
  {
    id: 'bconn-001',
    groups: [
      { theme: 'Won Rookie of the Year', players: ['Derek Jeter', 'Ichiro Suzuki', 'Mike Trout', 'Mike Piazza', 'Cal Ripken Jr.'], difficulty: 'yellow' },
      { theme: 'Played for the Boston Red Sox (as of 2026)', players: ['Mookie Betts', 'Carl Yastrzemski', 'Wade Boggs', 'Roger Clemens', 'Dwight Evans'], difficulty: 'green' },
      { theme: 'Hit 500+ career home runs', players: ['Ken Griffey Jr.', 'Jim Thome', 'Gary Sheffield', 'Barry Bonds', 'Alex Rodriguez'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic', players: ['Robinson Cano', 'Juan Soto', 'Fernando Tatis Jr.', 'Vladimir Guerrero', 'Nelson Cruz'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-002',
    groups: [
      { theme: 'Won Cy Young Award', players: ['Clayton Kershaw', 'Max Scherzer', 'Justin Verlander', 'Jacob deGrom', 'Greg Maddux'], difficulty: 'yellow' },
      { theme: 'Played for the New York Yankees (as of 2026)', players: ['Derek Jeter', 'Mariano Rivera', 'Aaron Judge', 'Mickey Mantle', 'Joe DiMaggio'], difficulty: 'green' },
      { theme: 'First overall draft pick', players: ['Bryce Harper', 'Ken Griffey Jr.', 'Chipper Jones', 'Adrian Gonzalez', 'Joe Mauer'], difficulty: 'blue' },
      { theme: 'Born in Japan', players: ['Hisashi Iwakuma', 'Yu Darvish', 'Hideo Nomo', 'Koji Uehara', 'Daisuke Matsuzaka'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-003',
    groups: [
      { theme: 'World Series MVP winners', players: ['Madison Bumgarner', 'David Ortiz', 'Jorge Soler', 'George Springer', 'Derek Jeter'], difficulty: 'yellow' },
      { theme: 'Stole 50+ bases in a season', players: ['Ichiro Suzuki', 'Lou Brock', 'Joe Morgan', 'Barry Larkin', 'Craig Biggio'], difficulty: 'green' },
      { theme: 'Played for the Los Angeles Dodgers (as of 2026)', players: ['Mookie Betts', 'Clayton Kershaw', 'Cody Bellinger', 'Mike Piazza', 'Duke Snider'], difficulty: 'blue' },
      { theme: 'Switch hitters', players: ['Chipper Jones', 'Carlos Beltran', 'Victor Martinez', 'Lance Berkman', 'Jorge Posada'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-004',
    groups: [
      { theme: 'Won Rookie of the Year', players: ['Mike Trout', 'Aaron Judge', 'Shohei Ohtani', 'Ichiro Suzuki', 'Albert Pujols'], difficulty: 'yellow' },
      { theme: 'Played for the Chicago Cubs (as of 2026)', players: ['Anthony Rizzo', 'Javier Baez', 'Jake Arrieta', 'Jon Lester', 'Ernie Banks'], difficulty: 'green' },
      { theme: '300+ career wins', players: ['Tom Glavine', 'Randy Johnson', 'Roger Clemens', 'Nolan Ryan', 'Steve Carlton'], difficulty: 'blue' },
      { theme: 'Born in Venezuela', players: ['Miguel Cabrera', 'Felix Hernandez', 'Jose Altuve', 'Salvador Perez', 'Omar Vizquel'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-005',
    groups: [
      { theme: 'Won the batting Triple Crown', players: ['Miguel Cabrera', 'Carl Yastrzemski', 'Frank Robinson', 'Mickey Mantle', 'Ted Williams'], difficulty: 'yellow' },
      { theme: 'Played for the Houston Astros (as of 2026)', players: ['Jose Altuve', 'Jeff Bagwell', 'Carlos Correa', 'George Springer', 'Alex Bregman'], difficulty: 'green' },
      { theme: 'Threw a no-hitter', players: ['Sandy Koufax', 'Max Scherzer', 'Roy Halladay', 'Clayton Kershaw', 'Hideo Nomo'], difficulty: 'blue' },
      { theme: 'Gold Glove winning catchers', players: ['Yadier Molina', 'Buster Posey', 'Salvador Perez', 'J.T. Realmuto', 'Johnny Bench'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-006',
    groups: [
      { theme: 'Hit 40+ HR in a season (2020s)', players: ['Aaron Judge', 'Pete Alonso', 'Kyle Schwarber', 'Matt Olson', 'Shohei Ohtani'], difficulty: 'yellow' },
      { theme: 'Played for the San Francisco Giants (as of 2026)', players: ['Willie Mays', 'Madison Bumgarner', 'Brandon Crawford', 'Tim Lincecum', 'Pablo Sandoval'], difficulty: 'green' },
      { theme: 'Career .300+ hitters (21st century)', players: ['Ichiro Suzuki', 'Miguel Cabrera', 'Jose Altuve', 'Todd Helton', 'Michael Young'], difficulty: 'blue' },
      { theme: 'Born in Cuba', players: ['Yoenis Cespedes', 'Aroldis Chapman', 'Jose Abreu', 'Yasiel Puig', 'Jose Canseco'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-007',
    groups: [
      { theme: '2024 World Series champion Dodgers', players: ['Freddie Freeman', 'Will Smith', 'Max Muncy', 'Enrique Hernandez', 'Walker Buehler'], difficulty: 'yellow' },
      { theme: 'Played for the St. Louis Cardinals (as of 2026)', players: ['Albert Pujols', 'Yadier Molina', 'Adam Wainwright', 'Matt Carpenter', 'Paul Goldschmidt'], difficulty: 'green' },
      { theme: 'Silver Slugger at shortstop', players: ['Trea Turner', 'Derek Jeter', 'Corey Seager', 'Francisco Lindor', 'Cal Ripken Jr.'], difficulty: 'blue' },
      { theme: 'Undrafted players', players: ['Ichiro Suzuki', 'Miguel Cabrera', 'Oliver Perez', 'Bartolo Colon', 'Aroldis Chapman'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-008',
    groups: [
      { theme: 'Won back-to-back MVPs', players: ['Mickey Mantle', 'Albert Pujols', 'Barry Bonds', 'Frank Thomas', 'Miguel Cabrera'], difficulty: 'yellow' },
      { theme: 'Played for the Atlanta Braves (as of 2026)', players: ['Chipper Jones', 'Freddie Freeman', 'Ronald Acuna Jr.', 'Greg Maddux', 'John Smoltz'], difficulty: 'green' },
      { theme: 'Hall of Fame shortstops', players: ['Cal Ripken Jr.', 'Ozzie Smith', 'Derek Jeter', 'Barry Larkin', 'Alan Trammell'], difficulty: 'blue' },
      { theme: 'Born in Japan', players: ['Ichiro Suzuki', 'Hideo Nomo', 'Yu Darvish', 'Hideki Matsui', 'Masahiro Tanaka'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-009',
    groups: [
      { theme: 'All-Star Game MVPs (2010s-2020s)', players: ['Mike Trout', 'Mariano Rivera', 'Robinson Cano', 'Vladimir Guerrero Jr.', 'Prince Fielder'], difficulty: 'yellow' },
      { theme: 'Played for the Philadelphia Phillies (as of 2026)', players: ['Bryce Harper', 'Trea Turner', 'J.T. Realmuto', 'Rhys Hoskins', 'Zack Wheeler'], difficulty: 'green' },
      { theme: 'Left-handed starting pitchers', players: ['Clayton Kershaw', 'Madison Bumgarner', 'Chris Sale', 'Jon Lester', 'Tom Glavine'], difficulty: 'blue' },
      { theme: 'Born in Puerto Rico', players: ['Carlos Beltran', 'Yadier Molina', 'Carlos Correa', 'Javier Baez', 'Francisco Lindor'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-010',
    groups: [
      { theme: '3,000+ career hits', players: ['Derek Jeter', 'Ichiro Suzuki', 'Albert Pujols', 'Tony Gwynn', 'Miguel Cabrera'], difficulty: 'yellow' },
      { theme: 'Played for the Texas Rangers (as of 2026)', players: ['Michael Young', 'Yu Darvish', 'Corey Seager', 'Max Scherzer', 'Ivan Rodriguez'], difficulty: 'green' },
      { theme: 'Closers with 300+ saves', players: ['Mariano Rivera', 'Kenley Jansen', 'Craig Kimbrel', 'Trevor Hoffman', 'Francisco Rodriguez'], difficulty: 'blue' },
      { theme: 'Went to the same college (Vanderbilt)', players: ['David Price', 'Sonny Gray', 'Dansby Swanson', 'Walker Buehler', 'Bryan Reynolds'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-011',
    groups: [
      { theme: '50+ HR in a single season', players: ['Mark McGwire', 'Giancarlo Stanton', 'Prince Fielder', 'Chris Davis', 'Shohei Ohtani'], difficulty: 'yellow' },
      { theme: 'Played for the Cleveland Guardians/Indians (as of 2026)', players: ['Francisco Lindor', 'Corey Kluber', 'Jose Ramirez', 'Manny Ramirez', 'Omar Vizquel'], difficulty: 'green' },
      { theme: 'Won Gold Glove at outfield', players: ['Torii Hunter', 'Mookie Betts', 'Byron Buxton', 'Kevin Kiermaier', 'Adam Jones'], difficulty: 'blue' },
      { theme: 'Born in Panama', players: ['Mariano Rivera', 'Carlos Lee', 'Rod Carew', 'Ben Oglivie', 'Manny Sanguillen'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-012',
    groups: [
      { theme: 'Pitchers with 3000+ strikeouts', players: ['Nolan Ryan', 'Randy Johnson', 'Roger Clemens', 'Justin Verlander', 'Max Scherzer'], difficulty: 'yellow' },
      { theme: 'Played for the Minnesota Twins (as of 2026)', players: ['Joe Mauer', 'Kirby Puckett', 'Torii Hunter', 'David Ortiz', 'Johan Santana'], difficulty: 'green' },
      { theme: 'Won batting title (2010s-2020s)', players: ['Jose Altuve', 'Charlie Blackmon', 'Buster Posey', 'Tim Anderson', 'Miguel Cabrera'], difficulty: 'blue' },
      { theme: 'Played college baseball at LSU', players: ['Alex Bregman', 'Paul Skenes', 'Aaron Nola', 'Kevin Gausman', 'Alex Lange'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-013',
    groups: [
      { theme: 'Multiple 100+ RBI seasons', players: ['Albert Pujols', 'Miguel Cabrera', 'Ken Griffey Jr.', 'David Ortiz', 'Alex Rodriguez'], difficulty: 'yellow' },
      { theme: 'Played for the Tampa Bay Rays (as of 2026)', players: ['Kevin Kiermaier', 'Carl Crawford', 'David Price', 'Wander Franco', 'Blake Snell'], difficulty: 'green' },
      { theme: 'Second basemen (21st century stars)', players: ['Jose Altuve', 'Brandon Phillips', 'Dustin Pedroia', 'DJ LeMahieu', 'Ian Kinsler'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic (pitchers)', players: ['Pedro Martinez', 'Bartolo Colon', 'Johnny Cueto', 'Luis Severino', 'Framber Valdez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-014',
    groups: [
      { theme: 'Won World Series with multiple teams', players: ['Reggie Jackson', 'Johnny Damon', 'Freddie Freeman', 'David Justice', 'Edgar Renteria'], difficulty: 'yellow' },
      { theme: 'Played for the San Diego Padres (as of 2026)', players: ['Fernando Tatis Jr.', 'Manny Machado', 'Juan Soto', 'Tony Gwynn', 'Trevor Hoffman'], difficulty: 'green' },
      { theme: 'Catchers who hit 30+ HR in a season', players: ['Johnny Bench', 'Gary Carter', 'Ivan Rodriguez', 'Salvador Perez', 'Jorge Posada'], difficulty: 'blue' },
      { theme: 'Played in the 2023 World Baseball Classic final', players: ['Shohei Ohtani', 'Mike Trout', 'Trea Turner', 'Paul Goldschmidt', 'Lars Nootbaar'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-015',
    groups: [
      { theme: 'NL MVP winners (2015-2025)', players: ['Bryce Harper', 'Kris Bryant', 'Cody Bellinger', 'Freddie Freeman', 'Shohei Ohtani'], difficulty: 'yellow' },
      { theme: 'Played for the Detroit Tigers (as of 2026)', players: ['Miguel Cabrera', 'Justin Verlander', 'Prince Fielder', 'Max Scherzer', 'Curtis Granderson'], difficulty: 'green' },
      { theme: 'Switch-hitting shortstops', players: ['Francisco Lindor', 'Jose Reyes', 'Jimmy Rollins', 'Ozzie Smith', 'Omar Vizquel'], difficulty: 'blue' },
      { theme: 'Closers with 300+ saves', players: ['Mariano Rivera', 'Trevor Hoffman', 'Lee Smith', 'Billy Wagner', 'Rollie Fingers'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-016',
    groups: [
      { theme: 'Born in Japan', players: ['Shohei Ohtani', 'Ichiro Suzuki', 'Hideki Matsui', 'Hideo Nomo', 'Koji Uehara'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Francisco Lindor', 'Carlos Correa', 'Roberto Clemente', 'Bernie Williams', 'Carlos Beltran'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Jose Altuve', 'Salvador Perez', 'Ronald Acuna Jr.', 'Miguel Cabrera', 'Luis Arraez'], difficulty: 'blue' },
      { theme: 'Father-son MLB players', players: ['Vladimir Guerrero Jr.', 'Fernando Tatis Jr.', 'Ken Griffey Jr.', 'Prince Fielder', 'Cavan Biggio'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-017',
    groups: [
      { theme: 'Born in Japan', players: ['Ichiro Suzuki', 'Hideki Matsui', 'Hideo Nomo', 'Yu Darvish', 'Daisuke Matsuzaka'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Roberto Clemente', 'Ivan Rodriguez', 'Carlos Beltran', 'Yadier Molina', 'Bernie Williams'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Miguel Cabrera', 'Felix Hernandez', 'Omar Vizquel', 'Johan Santana', 'Bobby Abreu'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic', players: ['Pedro Martinez', 'Vladimir Guerrero', 'Adrian Beltre', 'Juan Marichal', 'Sammy Sosa'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-018',
    groups: [
      { theme: 'Hall of Fame catchers', players: ['Johnny Bench', 'Yogi Berra', 'Carlton Fisk', 'Gary Carter', 'Mike Piazza'], difficulty: 'yellow' },
      { theme: 'Hall of Fame shortstops', players: ['Luis Aparicio', 'Ozzie Smith', 'Derek Jeter', 'Barry Larkin', 'Ernie Banks'], difficulty: 'green' },
      { theme: 'Hall of Fame third basemen', players: ['Mike Schmidt', 'George Brett', 'Wade Boggs', 'Brooks Robinson', 'Chipper Jones'], difficulty: 'blue' },
      { theme: 'Hall of Fame second basemen', players: ['Joe Morgan', 'Ryne Sandberg', 'Nellie Fox', 'Bill Mazeroski', 'Roberto Alomar'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-019',
    groups: [
      { theme: 'New York Yankees legends', players: ['Yogi Berra', 'Lou Gehrig', 'Mickey Mantle', 'Joe DiMaggio', 'Derek Jeter'], difficulty: 'yellow' },
      { theme: 'St. Louis Cardinals legends', players: ['Stan Musial', 'Bob Gibson', 'Ozzie Smith', 'Albert Pujols', 'Yadier Molina'], difficulty: 'green' },
      { theme: 'Boston Red Sox legends', players: ['Ted Williams', 'Carl Yastrzemski', 'David Ortiz', 'Pedro Martinez', 'Carlton Fisk'], difficulty: 'blue' },
      { theme: 'San Francisco Giants legends', players: ['Willie Mays', 'Barry Bonds', 'Willie McCovey', 'Buster Posey', 'Madison Bumgarner'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-020',
    groups: [
      { theme: 'Born in Cuba', players: ['Jose Abreu', 'Aroldis Chapman', 'Jose Canseco', 'Rafael Palmeiro', 'Tony Perez'], difficulty: 'yellow' },
      { theme: 'Born in Mexico', players: ['Fernando Valenzuela', 'Vinny Castilla', 'Esteban Loaiza', 'Joakim Soria', 'Julio Urias'], difficulty: 'green' },
      { theme: 'Born in the Dominican Republic', players: ['David Ortiz', 'Robinson Cano', 'Manny Ramirez', 'Bartolo Colon', 'Jose Bautista'], difficulty: 'blue' },
      { theme: 'Born in Venezuela', players: ['Jose Altuve', 'Salvador Perez', 'Ronald Acuna Jr.', 'Andres Galarraga', 'Pablo Sandoval'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-021',
    groups: [
      { theme: 'Dodgers legends', players: ['Sandy Koufax', 'Clayton Kershaw', 'Jackie Robinson', 'Don Drysdale', 'Fernando Valenzuela'], difficulty: 'yellow' },
      { theme: 'Chicago Cubs legends', players: ['Ernie Banks', 'Ron Santo', 'Ryne Sandberg', 'Sammy Sosa', 'Billy Williams'], difficulty: 'green' },
      { theme: 'Detroit Tigers legends', players: ['Ty Cobb', 'Al Kaline', 'Miguel Cabrera', 'Alan Trammell', 'Justin Verlander'], difficulty: 'blue' },
      { theme: 'Cincinnati Reds legends', players: ['Johnny Bench', 'Pete Rose', 'Joe Morgan', 'Barry Larkin', 'Tony Perez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-022',
    groups: [
      { theme: 'Hall of Fame first basemen', players: ['Lou Gehrig', 'Jeff Bagwell', 'Eddie Murray', 'Willie McCovey', 'Frank Thomas'], difficulty: 'yellow' },
      { theme: 'Hall of Fame relief pitchers', players: ['Mariano Rivera', 'Trevor Hoffman', 'Dennis Eckersley', 'Rollie Fingers', 'Goose Gossage'], difficulty: 'green' },
      { theme: 'Hall of Fame center fielders', players: ['Willie Mays', 'Ken Griffey Jr.', 'Kirby Puckett', 'Joe DiMaggio', 'Ty Cobb'], difficulty: 'blue' },
      { theme: 'Hall of Fame left-handed starting pitchers', players: ['Sandy Koufax', 'Steve Carlton', 'Warren Spahn', 'Randy Johnson', 'Tom Glavine'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-023',
    groups: [
      { theme: 'Born in Japan', players: ['Shohei Ohtani', 'Masahiro Tanaka', 'Kenta Maeda', 'Kodai Senga', 'Koji Uehara'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Francisco Lindor', 'Carlos Correa', 'Javier Baez', 'Roberto Alomar', 'Ivan Rodriguez'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Carlos Gonzalez', 'Elvis Andrus', 'Carlos Carrasco', 'Martin Prado', 'Asdrubal Cabrera'], difficulty: 'blue' },
      { theme: 'Born in Curacao', players: ['Andruw Jones', 'Andrelton Simmons', 'Kenley Jansen', 'Jurickson Profar', 'Ozzie Albies'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-024',
    groups: [
      { theme: 'Atlanta Braves legends', players: ['Hank Aaron', 'Chipper Jones', 'Greg Maddux', 'Tom Glavine', 'John Smoltz'], difficulty: 'yellow' },
      { theme: 'Baltimore Orioles legends', players: ['Cal Ripken Jr.', 'Brooks Robinson', 'Jim Palmer', 'Eddie Murray', 'Frank Robinson'], difficulty: 'green' },
      { theme: 'Philadelphia Phillies legends', players: ['Mike Schmidt', 'Steve Carlton', 'Ryan Howard', 'Chase Utley', 'Jimmy Rollins'], difficulty: 'blue' },
      { theme: 'Pittsburgh Pirates legends', players: ['Roberto Clemente', 'Willie Stargell', 'Honus Wagner', 'Barry Bonds', 'Ralph Kiner'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-025',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Juan Soto', 'Rafael Devers', 'Jose Ramirez', 'Julio Rodriguez', 'Starling Marte'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Gleyber Torres', 'Eugenio Suarez', 'Luis Arraez', 'Willson Contreras', 'Anthony Santander'], difficulty: 'green' },
      { theme: 'Born in Cuba', players: ['Yordan Alvarez', 'Randy Arozarena', 'Luis Robert', 'Yoenis Cespedes', 'Jorge Soler'], difficulty: 'blue' },
      { theme: 'Born in Panama', players: ['Mariano Rivera', 'Rod Carew', 'Carlos Lee', 'Manny Sanguillen', 'Ruben Tejada'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-026',
    groups: [
      { theme: 'Seattle Mariners legends', players: ['Ken Griffey Jr.', 'Edgar Martinez', 'Ichiro Suzuki', 'Felix Hernandez', 'Jay Buhner'], difficulty: 'yellow' },
      { theme: 'Houston Astros legends', players: ['Jeff Bagwell', 'Craig Biggio', 'Jose Altuve', 'Roy Oswalt', 'Lance Berkman'], difficulty: 'green' },
      { theme: 'San Diego Padres legends', players: ['Tony Gwynn', 'Trevor Hoffman', 'Benito Santiago', 'Jake Peavy', 'Randy Jones'], difficulty: 'blue' },
      { theme: 'Minnesota Twins legends', players: ['Rod Carew', 'Kirby Puckett', 'Harmon Killebrew', 'Joe Mauer', 'Johan Santana'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-027',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Nelson Cruz', 'Edwin Encarnacion', 'Hanley Ramirez', 'Aramis Ramirez', 'Melky Cabrera'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Carlos Delgado', 'Juan Gonzalez', 'Bernie Williams', 'Jorge Posada', 'Carlos Correa'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Magglio Ordonez', 'Victor Martinez', 'Carlos Gonzalez', 'Endy Chavez', 'Freddy Garcia'], difficulty: 'blue' },
      { theme: 'Born in Colombia', players: ['Edgar Renteria', 'Orlando Cabrera', 'Julio Teheran', 'Jose Quintana', 'Giovanny Urshela'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-028',
    groups: [
      { theme: 'Hall of Fame right fielders', players: ['Hank Aaron', 'Roberto Clemente', 'Ichiro Suzuki', 'Reggie Jackson', 'Tony Gwynn'], difficulty: 'yellow' },
      { theme: 'Hall of Fame left fielders', players: ['Ted Williams', 'Lou Brock', 'Rickey Henderson', 'Tim Raines', 'Jim Rice'], difficulty: 'green' },
      { theme: 'Hall of Fame first basemen', players: ['Jeff Bagwell', 'Eddie Murray', 'Lou Gehrig', 'Frank Thomas', 'Tony Perez'], difficulty: 'blue' },
      { theme: 'Hall of Fame starting pitchers', players: ['Nolan Ryan', 'Bob Gibson', 'Pedro Martinez', 'Greg Maddux', 'Tom Seaver'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-029',
    groups: [
      { theme: 'Oakland Athletics legends', players: ['Rickey Henderson', 'Reggie Jackson', 'Jose Canseco', 'Mark McGwire', 'Catfish Hunter'], difficulty: 'yellow' },
      { theme: 'Kansas City Royals legends', players: ['George Brett', 'Bret Saberhagen', 'Frank White', 'Salvador Perez', 'Alex Gordon'], difficulty: 'green' },
      { theme: 'Milwaukee Brewers legends', players: ['Robin Yount', 'Paul Molitor', 'Ryan Braun', 'Prince Fielder', 'Cecil Cooper'], difficulty: 'blue' },
      { theme: 'Cleveland Guardians legends', players: ['Bob Feller', 'Jim Thome', 'Omar Vizquel', 'Kenny Lofton', 'Manny Ramirez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-030',
    groups: [
      { theme: 'Born in Japan', players: ['Hideki Matsui', 'Hideo Nomo', 'Kenta Maeda', 'Koji Uehara', 'Kazuo Matsui'], difficulty: 'yellow' },
      { theme: 'Born in South Korea', players: ['Chan Ho Park', 'Hyun-Jin Ryu', 'Shin-Soo Choo', 'Jung Hoo Lee', 'Ha-Seong Kim'], difficulty: 'green' },
      { theme: 'Born in Cuba', players: ['Minnie Minoso', 'Tony Oliva', 'Luis Tiant', 'Jose Contreras', 'Kendrys Morales'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic', players: ['George Bell', 'Tony Fernandez', 'Pedro Guerrero', 'Cesar Cedeno', 'Julio Franco'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-031',
    groups: [
      { theme: 'Texas Rangers legends', players: ['Elvis Andrus', 'Juan Gonzalez', 'Adrian Beltre', 'Michael Young', 'Rafael Palmeiro'], difficulty: 'yellow' },
      { theme: 'Toronto Blue Jays legends', players: ['Roy Halladay', 'George Bell', 'Joe Carter', 'Dave Stieb', 'Vladimir Guerrero Jr.'], difficulty: 'green' },
      { theme: 'New York Mets legends', players: ['Tom Seaver', 'David Wright', 'Mike Piazza', 'Dwight Gooden', 'Keith Hernandez'], difficulty: 'blue' },
      { theme: 'Montreal Expos / Washington Nationals legends', players: ['Andre Dawson', 'Tim Raines', 'Ryan Zimmerman', 'Stephen Strasburg', 'Dennis Martinez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-032',
    groups: [
      { theme: 'Los Angeles Angels legends', players: ['Mike Trout', 'Nolan Ryan', 'Tim Salmon', 'Garret Anderson', 'Chuck Finley'], difficulty: 'yellow' },
      { theme: 'Colorado Rockies legends', players: ['Todd Helton', 'Larry Walker', 'Carlos Gonzalez', 'Troy Tulowitzki', 'Charlie Blackmon'], difficulty: 'green' },
      { theme: 'Arizona Diamondbacks legends', players: ['Randy Johnson', 'Luis Gonzalez', 'Paul Goldschmidt', 'Ketel Marte', 'Brandon Webb'], difficulty: 'blue' },
      { theme: 'Tampa Bay Rays legends', players: ['James Shields', 'Carl Crawford', 'David Price', 'Ben Zobrist', 'Kevin Kiermaier'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-033',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Sandy Alcantara', 'Framber Valdez', 'Teoscar Hernandez', 'Eloy Jimenez', 'Cristian Javier'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Andres Gimenez', 'Ranger Suarez', 'Pablo Lopez', 'Avisail Garcia', 'Rougned Odor'], difficulty: 'green' },
      { theme: 'Born in Puerto Rico', players: ['Enrique Hernandez', 'Christian Vazquez', 'Eddie Rosario', 'Jose Berrios', 'Emmanuel Rivera'], difficulty: 'blue' },
      { theme: 'Born in Cuba', players: ['Yasmani Grandal', 'Adolis Garcia', 'Yuli Gurriel', 'Raisel Iglesias', 'Yandy Diaz'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-034',
    groups: [
      { theme: 'Born in Japan', players: ['Shohei Ohtani', 'Seiya Suzuki', 'Masataka Yoshida', 'Yoshinobu Yamamoto', 'Shota Imanaga'], difficulty: 'yellow' },
      { theme: 'Born in Mexico', players: ['Roberto Osuna', 'Isaac Paredes', 'Alejandro Kirk', 'Luis Urias', 'Julio Urias'], difficulty: 'green' },
      { theme: 'Born in Canada', players: ['Joey Votto', 'Larry Walker', 'Russell Martin', 'Justin Morneau', 'James Paxton'], difficulty: 'blue' },
      { theme: 'Born in Colombia', players: ['Edgar Renteria', 'Orlando Cabrera', 'Jose Quintana', 'Julio Teheran', 'Donovan Solano'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-035',
    groups: [
      { theme: 'Hall of Fame first basemen', players: ['Lou Gehrig', 'Jimmie Foxx', 'Jeff Bagwell', 'Eddie Murray', 'Todd Helton'], difficulty: 'yellow' },
      { theme: 'Hall of Fame left fielders', players: ['Ted Williams', 'Tim Raines', 'Joe Medwick', 'Jim Rice', 'Ralph Kiner'], difficulty: 'green' },
      { theme: 'Hall of Fame right fielders', players: ['Hank Aaron', 'Roberto Clemente', 'Mel Ott', 'Reggie Jackson', 'Vladimir Guerrero'], difficulty: 'blue' },
      { theme: 'Hall of Fame center fielders', players: ['Willie Mays', 'Tris Speaker', 'Joe DiMaggio', 'Richie Ashburn', 'Edd Roush'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-036',
    groups: [
      { theme: 'Hall of Fame catchers', players: ['Johnny Bench', 'Carlton Fisk', 'Gary Carter', 'Yogi Berra', 'Roy Campanella'], difficulty: 'yellow' },
      { theme: 'Hall of Fame shortstops', players: ['Derek Jeter', 'Ozzie Smith', 'Robin Yount', 'Alan Trammell', 'Luis Aparicio'], difficulty: 'green' },
      { theme: 'Hall of Fame second basemen', players: ['Joe Morgan', 'Charlie Gehringer', 'Nap Lajoie', 'Roberto Alomar', 'Ryne Sandberg'], difficulty: 'blue' },
      { theme: 'Hall of Fame third basemen', players: ['Mike Schmidt', 'George Brett', 'Wade Boggs', 'Brooks Robinson', 'Eddie Mathews'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-037',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Juan Marichal', 'Sammy Sosa', 'Vladimir Guerrero', 'David Ortiz', 'Pedro Martinez'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Luis Aparicio', 'Dave Concepcion', 'Ozzie Guillen', 'Andres Galarraga', 'Bobby Abreu'], difficulty: 'green' },
      { theme: 'Born in Puerto Rico', players: ['Roberto Clemente', 'Orlando Cepeda', 'Ivan Rodriguez', 'Roberto Alomar', 'Carlos Beltran'], difficulty: 'blue' },
      { theme: 'Born in Cuba', players: ['Tony Perez', 'Tony Oliva', 'Minnie Minoso', 'Jose Canseco', 'Rafael Palmeiro'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-038',
    groups: [
      { theme: 'Hall of Fame right-handed starting pitchers', players: ['Tom Seaver', 'Bob Gibson', 'Nolan Ryan', 'Christy Mathewson', 'Cy Young'], difficulty: 'yellow' },
      { theme: 'Hall of Fame left-handed pitchers', players: ['Sandy Koufax', 'Steve Carlton', 'Warren Spahn', 'Whitey Ford', 'Lefty Grove'], difficulty: 'green' },
      { theme: 'Hall of Fame relief pitchers', players: ['Mariano Rivera', 'Trevor Hoffman', 'Lee Smith', 'Rollie Fingers', 'Bruce Sutter'], difficulty: 'blue' },
      { theme: 'Hall of Fame designated hitters / sluggers', players: ['Frank Thomas', 'Edgar Martinez', 'David Ortiz', 'Harold Baines', 'Paul Molitor'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-039',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Vladimir Guerrero', 'Albert Pujols', 'Robinson Cano', 'Adrian Beltre', 'Manny Ramirez'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Miguel Cabrera', 'Jose Altuve', 'Felix Hernandez', 'Omar Vizquel', 'Johan Santana'], difficulty: 'green' },
      { theme: 'Born in Japan', players: ['Ichiro Suzuki', 'Hideki Matsui', 'Hideo Nomo', 'Yu Darvish', 'Daisuke Matsuzaka'], difficulty: 'blue' },
      { theme: 'Born in South Korea', players: ['Chan Ho Park', 'Hyun-Jin Ryu', 'Shin-Soo Choo', 'Jung Hoo Lee', 'Ha-Seong Kim'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-040',
    groups: [
      { theme: 'Won a Gold Glove at shortstop', players: ['Ozzie Smith', 'Omar Vizquel', 'Andrelton Simmons', 'Mark Belanger', 'Barry Larkin'], difficulty: 'yellow' },
      { theme: 'Won a Gold Glove in the outfield', players: ['Ken Griffey Jr.', 'Andruw Jones', 'Ichiro Suzuki', 'Kevin Kiermaier', 'Jim Edmonds'], difficulty: 'green' },
      { theme: 'Won a Gold Glove at first base', players: ['Keith Hernandez', 'Don Mattingly', 'Albert Pujols', 'Anthony Rizzo', 'J.T. Snow'], difficulty: 'blue' },
      { theme: 'Won a Gold Glove at catcher', players: ['Ivan Rodriguez', 'Yadier Molina', 'Bob Boone', 'Salvador Perez', 'Johnny Bench'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-041',
    groups: [
      { theme: 'Hall of Fame catchers', players: ['Mike Piazza', 'Ivan Rodriguez', 'Bill Dickey', 'Mickey Cochrane', 'Gabby Hartnett'], difficulty: 'yellow' },
      { theme: 'Hall of Fame shortstops', players: ['Derek Jeter', 'Barry Larkin', 'Ernie Banks', 'Honus Wagner', 'Pee Wee Reese'], difficulty: 'green' },
      { theme: 'Hall of Fame second basemen', players: ['Joe Morgan', 'Bill Mazeroski', 'Roberto Alomar', 'Rod Carew', 'Charlie Gehringer'], difficulty: 'blue' },
      { theme: 'Hall of Fame third basemen', players: ['Chipper Jones', 'Mike Schmidt', 'Pie Traynor', 'Ron Santo', 'Scott Rolen'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-042',
    groups: [
      { theme: 'Born in Cuba', players: ['Jose Abreu', 'Aroldis Chapman', 'Yoenis Cespedes', 'Kendrys Morales', 'Jose Contreras'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Yadier Molina', 'Francisco Lindor', 'Carlos Correa', 'Javier Baez', 'Carlos Delgado'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Salvador Perez', 'Ronald Acuna Jr.', 'Pablo Sandoval', 'Asdrubal Cabrera', 'Magglio Ordonez'], difficulty: 'blue' },
      { theme: 'Born in the Dominican Republic', players: ['Juan Soto', 'Rafael Devers', 'Jose Ramirez', 'Starling Marte', 'Jose Bautista'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-043',
    groups: [
      { theme: 'Won a Silver Slugger at catcher', players: ['Mike Piazza', 'Ivan Rodriguez', 'Buster Posey', 'Salvador Perez', 'J.T. Realmuto'], difficulty: 'yellow' },
      { theme: 'Won a Silver Slugger at shortstop', players: ['Cal Ripken Jr.', 'Alan Trammell', 'Derek Jeter', 'Francisco Lindor', 'Trea Turner'], difficulty: 'green' },
      { theme: 'Won a Silver Slugger at second base', players: ['Robinson Cano', 'Jeff Kent', 'Ryne Sandberg', 'Jose Altuve', 'Dustin Pedroia'], difficulty: 'blue' },
      { theme: 'Won a Silver Slugger at third base', players: ['Mike Schmidt', 'Wade Boggs', 'Adrian Beltre', 'Nolan Arenado', 'Manny Machado'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-044',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Nelson Cruz', 'Edwin Encarnacion', 'Hanley Ramirez', 'Aramis Ramirez', 'Melky Cabrera'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Carlos Gonzalez', 'Victor Martinez', 'Freddy Garcia', 'Carlos Carrasco', 'Gleyber Torres'], difficulty: 'green' },
      { theme: 'Born in Mexico', players: ['Fernando Valenzuela', 'Vinny Castilla', 'Alejandro Kirk', 'Joakim Soria', 'Jorge De La Rosa'], difficulty: 'blue' },
      { theme: 'Born in Curacao', players: ['Andruw Jones', 'Andrelton Simmons', 'Kenley Jansen', 'Jurickson Profar', 'Ozzie Albies'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-045',
    groups: [
      { theme: 'Hall of Fame left fielders', players: ['Lou Brock', 'Ted Williams', 'Ralph Kiner', 'Minnie Minoso', 'Goose Goslin'], difficulty: 'yellow' },
      { theme: 'Hall of Fame right fielders', players: ['Tony Gwynn', 'Roberto Clemente', 'Vladimir Guerrero', 'Paul Waner', 'Larry Walker'], difficulty: 'green' },
      { theme: 'Hall of Fame first basemen', players: ['Jeff Bagwell', 'Frank Thomas', 'Tony Perez', 'Eddie Murray', 'George Sisler'], difficulty: 'blue' },
      { theme: 'Hall of Fame center fielders', players: ['Ken Griffey Jr.', 'Joe DiMaggio', 'Willie Mays', 'Richie Ashburn', 'Larry Doby'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-046',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Felipe Alou', 'George Bell', 'Tony Fernandez', 'Pedro Guerrero', 'Julio Franco'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Wilson Ramos', 'Elvis Andrus', 'Martin Prado', 'Eugenio Suarez', 'Cesar Hernandez'], difficulty: 'green' },
      { theme: 'Born in Puerto Rico', players: ['Sandy Alomar Jr.', 'Bernie Williams', 'Jorge Posada', 'Carlos Baerga', 'Ruben Sierra'], difficulty: 'blue' },
      { theme: 'Born in Panama', players: ['Mariano Rivera', 'Rod Carew', 'Carlos Lee', 'Manny Sanguillen', 'Ben Oglivie'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-047',
    groups: [
      { theme: 'Won a Gold Glove at third base', players: ['Brooks Robinson', 'Mike Schmidt', 'Nolan Arenado', 'Scott Rolen', 'Adrian Beltre'], difficulty: 'yellow' },
      { theme: 'Won a Gold Glove at second base', players: ['Roberto Alomar', 'Ryne Sandberg', 'Bill Mazeroski', 'Craig Biggio', 'Dustin Pedroia'], difficulty: 'green' },
      { theme: 'Won a Gold Glove in center field', players: ['Willie Mays', 'Andruw Jones', 'Ken Griffey Jr.', 'Kevin Kiermaier', 'Devon White'], difficulty: 'blue' },
      { theme: 'Won a Gold Glove as a pitcher', players: ['Greg Maddux', 'Jim Kaat', 'Bob Gibson', 'Mark Buehrle', 'Zack Greinke'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-048',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Juan Soto', 'Julio Rodriguez', 'Wander Franco', 'Eloy Jimenez', 'Gregory Polanco'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Jose Altuve', 'Ronald Acuna Jr.', 'Luis Arraez', 'Willson Contreras', 'Salvador Perez'], difficulty: 'green' },
      { theme: 'Born in Cuba', players: ['Yordan Alvarez', 'Randy Arozarena', 'Luis Robert', 'Jorge Soler', 'Yoenis Cespedes'], difficulty: 'blue' },
      { theme: 'Born in Japan', players: ['Masahiro Tanaka', 'Kenta Maeda', 'Koji Uehara', 'Kodai Senga', 'Kazuo Matsui'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-049',
    groups: [
      { theme: 'Hall of Fame starting pitchers', players: ['Greg Maddux', 'Pedro Martinez', 'Randy Johnson', 'Tom Seaver', 'Bob Gibson'], difficulty: 'yellow' },
      { theme: 'Hall of Fame relief pitchers', players: ['Lee Smith', 'Goose Gossage', 'Hoyt Wilhelm', 'Bruce Sutter', 'Billy Wagner'], difficulty: 'green' },
      { theme: 'Hall of Fame catchers', players: ['Yogi Berra', 'Roy Campanella', 'Gary Carter', 'Carlton Fisk', 'Ernie Lombardi'], difficulty: 'blue' },
      { theme: 'Hall of Fame shortstops', players: ['Ozzie Smith', 'Luis Aparicio', 'Robin Yount', 'Joe Cronin', 'Travis Jackson'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-050',
    groups: [
      { theme: 'Born in Japan', players: ['Hideki Matsui', 'Hideo Nomo', 'Norichika Aoki', 'Kosuke Fukudome', 'So Taguchi'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Juan Gonzalez', 'Yadier Molina', 'Benito Santiago', 'Jose Cruz', 'Felix Millan'], difficulty: 'green' },
      { theme: 'Born in Mexico', players: ['Bobby Avila', 'Aurelio Rodriguez', 'Teddy Higuera', 'Esteban Loaiza', 'Yovani Gallardo'], difficulty: 'blue' },
      { theme: 'Born in Australia', players: ['Liam Hendriks', 'Grant Balfour', 'Dave Nilsson', 'Travis Blackley', 'Peter Moylan'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-051',
    groups: [
      { theme: 'Won a Silver Slugger in the outfield', players: ['Barry Bonds', 'Tony Gwynn', 'Sammy Sosa', 'Ken Griffey Jr.', 'Mike Trout'], difficulty: 'yellow' },
      { theme: 'Won a Silver Slugger at first base', players: ['Jeff Bagwell', 'Mark McGwire', 'Todd Helton', 'Freddie Freeman', 'Paul Goldschmidt'], difficulty: 'green' },
      { theme: 'Won a Silver Slugger at designated hitter', players: ['David Ortiz', 'Edgar Martinez', 'Paul Molitor', 'Harold Baines', 'Shohei Ohtani'], difficulty: 'blue' },
      { theme: 'Won a Silver Slugger at catcher', players: ['Mike Piazza', 'Ivan Rodriguez', 'Gary Carter', 'Buster Posey', 'Joe Mauer'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-052',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Bartolo Colon', 'Johnny Cueto', 'Marcell Ozuna', 'Carlos Santana', 'Jose Reyes'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Omar Infante', 'Gerardo Parra', 'Marwin Gonzalez', 'Henderson Alvarez', 'Avisail Garcia'], difficulty: 'green' },
      { theme: 'Born in Puerto Rico', players: ['Enrique Hernandez', 'Eddie Rosario', 'Christian Vazquez', 'Jose Berrios', 'Carlos Correa'], difficulty: 'blue' },
      { theme: 'Born in Cuba', players: ['Aroldis Chapman', 'Yuli Gurriel', 'Adolis Garcia', 'Yandy Diaz', 'Luis Robert'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-053',
    groups: [
      { theme: 'Hall of Fame third basemen', players: ['Mike Schmidt', 'Chipper Jones', 'Eddie Mathews', 'Brooks Robinson', 'Wade Boggs'], difficulty: 'yellow' },
      { theme: 'Hall of Fame first basemen', players: ['Lou Gehrig', 'Jimmie Foxx', 'Hank Greenberg', 'Willie McCovey', 'Bill Terry'], difficulty: 'green' },
      { theme: 'Hall of Fame second basemen', players: ['Joe Morgan', 'Roberto Alomar', 'Eddie Collins', 'Charlie Gehringer', 'Ryne Sandberg'], difficulty: 'blue' },
      { theme: 'Hall of Fame shortstops', players: ['Alan Trammell', 'Derek Jeter', 'Honus Wagner', 'Barry Larkin', 'Ozzie Smith'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-054',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Robinson Cano', 'Starling Marte', 'Jose Ramirez', 'Rafael Devers', 'Teoscar Hernandez'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Andres Gimenez', 'Pablo Lopez', 'Ranger Suarez', 'Eugenio Suarez', 'Gleyber Torres'], difficulty: 'green' },
      { theme: 'Born in Colombia', players: ['Edgar Renteria', 'Orlando Cabrera', 'Giovanny Urshela', 'Jose Quintana', 'Donovan Solano'], difficulty: 'blue' },
      { theme: 'Born in Curacao', players: ['Andruw Jones', 'Kenley Jansen', 'Ozzie Albies', 'Andrelton Simmons', 'Jurickson Profar'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-055',
    groups: [
      { theme: 'Won a Gold Glove in the outfield', players: ['Roberto Clemente', 'Willie Mays', 'Al Kaline', 'Dwight Evans', 'Torii Hunter'], difficulty: 'yellow' },
      { theme: 'Won a Gold Glove at first base', players: ['Keith Hernandez', 'Wes Parker', 'George Scott', 'Mark Grace', 'Vic Power'], difficulty: 'green' },
      { theme: 'Won a Gold Glove at second base', players: ['Bill Mazeroski', 'Joe Morgan', 'Frank White', 'Roberto Alomar', 'Ian Kinsler'], difficulty: 'blue' },
      { theme: 'Won a Gold Glove at shortstop', players: ['Ozzie Smith', 'Mark Belanger', 'Omar Vizquel', 'Dave Concepcion', 'Rey Ordonez'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-056',
    groups: [
      { theme: 'Born in Japan', players: ['Shohei Ohtani', 'Seiya Suzuki', 'Yu Darvish', 'Yoshinobu Yamamoto', 'Masataka Yoshida'], difficulty: 'yellow' },
      { theme: 'Born in the Dominican Republic', players: ['Sandy Alcantara', 'Framber Valdez', 'Cristian Javier', 'Eloy Jimenez', 'Gregory Polanco'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Luis Arraez', 'Salvador Perez', 'Ronald Acuna Jr.', 'Andres Gimenez', 'Willson Contreras'], difficulty: 'blue' },
      { theme: 'Born in Cuba', players: ['Yordan Alvarez', 'Luis Robert', 'Randy Arozarena', 'Yandy Diaz', 'Adolis Garcia'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-057',
    groups: [
      { theme: 'Hall of Fame center fielders', players: ['Richie Ashburn', 'Tris Speaker', 'Willie Mays', 'Mickey Mantle', 'Joe DiMaggio'], difficulty: 'yellow' },
      { theme: 'Hall of Fame right fielders', players: ['Roberto Clemente', 'Hank Aaron', 'Mel Ott', 'Larry Walker', 'Reggie Jackson'], difficulty: 'green' },
      { theme: 'Hall of Fame left fielders', players: ['Ted Williams', 'Willie Stargell', 'Ralph Kiner', 'Carl Yastrzemski', 'Lou Brock'], difficulty: 'blue' },
      { theme: 'Hall of Fame catchers', players: ['Johnny Bench', 'Yogi Berra', 'Carlton Fisk', 'Gary Carter', 'Mike Piazza'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-058',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Pedro Martinez', 'Vladimir Guerrero', 'Sammy Sosa', 'Juan Marichal', 'David Ortiz'], difficulty: 'yellow' },
      { theme: 'Born in Puerto Rico', players: ['Roberto Clemente', 'Ivan Rodriguez', 'Orlando Cepeda', 'Roberto Alomar', 'Carlos Beltran'], difficulty: 'green' },
      { theme: 'Born in Venezuela', players: ['Luis Aparicio', 'Miguel Cabrera', 'Jose Altuve', 'Omar Vizquel', 'Bobby Abreu'], difficulty: 'blue' },
      { theme: 'Born in Mexico', players: ['Fernando Valenzuela', 'Vinny Castilla', 'Joakim Soria', 'Yovani Gallardo', 'Roberto Osuna'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-059',
    groups: [
      { theme: 'Hall of Fame right-handed starting pitchers', players: ['Walter Johnson', 'Christy Mathewson', 'Bob Feller', 'Jim Palmer', 'Phil Niekro'], difficulty: 'yellow' },
      { theme: 'Hall of Fame left-handed pitchers', players: ['Lefty Grove', 'Sandy Koufax', 'Steve Carlton', 'Warren Spahn', 'Tom Glavine'], difficulty: 'green' },
      { theme: 'Hall of Fame relief pitchers', players: ['Mariano Rivera', 'Trevor Hoffman', 'Rollie Fingers', 'Bruce Sutter', 'Goose Gossage'], difficulty: 'blue' },
      { theme: 'Hall of Fame third basemen', players: ['Mike Schmidt', 'George Brett', 'Brooks Robinson', 'Chipper Jones', 'Eddie Mathews'], difficulty: 'purple' },
    ],
  },
  {
    id: 'bconn-060',
    groups: [
      { theme: 'Born in the Dominican Republic', players: ['Albert Pujols', 'Adrian Beltre', 'Robinson Cano', 'Manny Ramirez', 'Bartolo Colon'], difficulty: 'yellow' },
      { theme: 'Born in Venezuela', players: ['Felix Hernandez', 'Johan Santana', 'Andres Galarraga', 'Pablo Sandoval', 'Carlos Gonzalez'], difficulty: 'green' },
      { theme: 'Born in Cuba', players: ['Jose Abreu', 'Rafael Palmeiro', 'Jose Canseco', 'Yoenis Cespedes', 'Kendrys Morales'], difficulty: 'blue' },
      { theme: 'Born in Puerto Rico', players: ['Carlos Delgado', 'Juan Gonzalez', 'Bernie Williams', 'Javier Baez', 'Francisco Lindor'], difficulty: 'purple' },
    ],
  },
];
