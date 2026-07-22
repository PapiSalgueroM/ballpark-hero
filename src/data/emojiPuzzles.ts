/**
 * Emoji Guess — authored clue bank.
 *
 * Kept in-repo (like shirtNumberPuzzles / the Missing XI LINEUPS array) rather
 * than in a DB table: this is authored editorial content with zero scrape risk,
 * and the 2026-07-15 audit found scrape-shift corruption in enough tables that
 * hand-written content should stay hand-written.
 *
 * Every answer was fact-checked when written: nicknames (Mbappé "the Ninja
 * Turtle", Salah "the Egyptian King", Pirlo "l'architetto"), moments (Agüero
 * 93:20 vs QPR 2012, Ramos' Lisbon header, Lewandowski's 5 goals in 9 minutes
 * vs Wolfsburg 2015), and crests (Valencia's bat, Inter's serpent, Atlético's
 * bear and tree). If you edit an entry, keep the fact right.
 *
 * NOTE ON FLAG EMOJI: Windows Chrome renders country-flag emoji as letter
 * pairs ("🇵🇹" -> "PT"). That makes flag clues EASIER on Windows, not broken —
 * acceptable for a guessing game, so flags are used as supporting clues, never
 * the whole puzzle.
 */

export type EmojiCategory = 'player' | 'club' | 'manager' | 'moment';
export type EmojiDifficulty = 'easy' | 'medium' | 'hard';

export interface EmojiPuzzle {
  id: string;
  emoji: string;
  answer: string;
  /** Normalized-compare alternatives (nicknames, short names, common spellings). */
  aliases: string[];
  category: EmojiCategory;
  difficulty: EmojiDifficulty;
  /** Shown after the first wrong guess. */
  hint: string;
}

export const EMOJI_PUZZLES: EmojiPuzzle[] = [
  // ---------------- Players — easy ----------------
  { id: 'p-messi', emoji: '🐐🇦🇷', answer: 'Lionel Messi', aliases: ['Messi', 'Leo Messi'], category: 'player', difficulty: 'easy', hint: 'Eight Ballon d’Ors and a 2022 World Cup.' },
  { id: 'p-ronaldo', emoji: '7️⃣🇵🇹', answer: 'Cristiano Ronaldo', aliases: ['Ronaldo', 'CR7', 'Cristiano'], category: 'player', difficulty: 'easy', hint: 'Siuuu.' },
  { id: 'p-mbappe', emoji: '🐢🇫🇷⚡', answer: 'Kylian Mbappé', aliases: ['Mbappe', 'Mbappé', 'Kylian Mbappe'], category: 'player', difficulty: 'easy', hint: 'Teammates nicknamed him the Ninja Turtle.' },
  { id: 'p-salah', emoji: '🇪🇬👑', answer: 'Mohamed Salah', aliases: ['Salah', 'Mo Salah'], category: 'player', difficulty: 'easy', hint: 'The Egyptian King of Anfield.' },
  { id: 'p-haaland', emoji: '🥶🤖🇳🇴', answer: 'Erling Haaland', aliases: ['Haaland'], category: 'player', difficulty: 'easy', hint: 'Norwegian goal machine in sky blue.' },
  { id: 'p-neymar', emoji: '🇧🇷💫🤸', answer: 'Neymar', aliases: ['Neymar Jr', 'Neymar Junior'], category: 'player', difficulty: 'easy', hint: 'The most expensive transfer ever, to Paris.' },
  { id: 'p-son', emoji: '🇰🇷⚽😄', answer: 'Son Heung-min', aliases: ['Son', 'Heung-min Son', 'Sonny'], category: 'player', difficulty: 'easy', hint: 'North London’s smiling captain.' },
  { id: 'p-bellingham', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿🤷⚪', answer: 'Jude Bellingham', aliases: ['Bellingham'], category: 'player', difficulty: 'easy', hint: 'Arms out wide at the Bernabéu. Hey Jude.' },
  { id: 'p-kane', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿🎯©️', answer: 'Harry Kane', aliases: ['Kane'], category: 'player', difficulty: 'easy', hint: 'England’s record goalscorer.' },
  { id: 'p-pele', emoji: '🇧🇷👑🏆🏆🏆', answer: 'Pelé', aliases: ['Pele'], category: 'player', difficulty: 'easy', hint: 'The only man with three World Cups.' },

  // ---------------- Players — medium ----------------
  { id: 'p-debruyne', emoji: '👨‍🦰🎯🔵', answer: 'Kevin De Bruyne', aliases: ['De Bruyne', 'KDB'], category: 'player', difficulty: 'medium', hint: 'Belgian assist king of the Etihad.' },
  { id: 'p-lewandowski', emoji: '🇵🇱⚽5️⃣⏱️9️⃣', answer: 'Robert Lewandowski', aliases: ['Lewandowski', 'Lewy'], category: 'player', difficulty: 'medium', hint: 'Five goals in nine minutes off the bench, 2015.' },
  { id: 'p-modric', emoji: '🇭🇷🎻', answer: 'Luka Modrić', aliases: ['Modric', 'Luka Modric'], category: 'player', difficulty: 'medium', hint: 'The midfield violinist who broke the Messi–Ronaldo Ballon d’Or streak.' },
  { id: 'p-kante', emoji: '🔋😊🇫🇷', answer: "N'Golo Kanté", aliases: ['Kante', 'NGolo Kante', "N'Golo Kante"], category: 'player', difficulty: 'medium', hint: 'Covers 70% of the earth, smiles the whole time.' },
  { id: 'p-drogba', emoji: '🐘🇨🇮🔵', answer: 'Didier Drogba', aliases: ['Drogba'], category: 'player', difficulty: 'medium', hint: 'Ivorian elephant, Munich 2012 hero.' },
  { id: 'p-zlatan', emoji: '🦁🇸🇪🥋', answer: 'Zlatan Ibrahimović', aliases: ['Zlatan', 'Ibrahimovic', 'Zlatan Ibrahimovic', 'Ibra'], category: 'player', difficulty: 'medium', hint: 'Taekwondo black belt. Refers to himself in the third person.' },
  { id: 'p-vandijk', emoji: '🇳🇱🗿🛡️', answer: 'Virgil van Dijk', aliases: ['Van Dijk', 'VVD'], category: 'player', difficulty: 'medium', hint: 'The colossus Liverpool paid a defender-record fee for.' },
  { id: 'p-ramos', emoji: '🇪🇸🟥⏱️9️⃣3️⃣', answer: 'Sergio Ramos', aliases: ['Ramos'], category: 'player', difficulty: 'medium', hint: 'Red cards for days — and THAT header in Lisbon, minute 93.' },
  { id: 'p-aguero', emoji: '🔵🇦🇷9️⃣3️⃣:2️⃣0️⃣', answer: 'Sergio Agüero', aliases: ['Aguero', 'Kun Aguero', 'Sergio Aguero'], category: 'player', difficulty: 'medium', hint: 'QPR, 2012. AGUEROOOOO.' },
  { id: 'p-iniesta', emoji: '🇪🇸🪄🏆2️⃣0️⃣1️⃣0️⃣', answer: 'Andrés Iniesta', aliases: ['Iniesta', 'Andres Iniesta'], category: 'player', difficulty: 'medium', hint: 'Scored the only goal of a World Cup final.' },
  { id: 'p-vardy', emoji: '🦊🎉5️⃣0️⃣0️⃣0️⃣', answer: 'Jamie Vardy', aliases: ['Vardy'], category: 'player', difficulty: 'medium', hint: 'From non-league to a 5000-1 title. Party in his house.' },
  { id: 'p-yamal', emoji: '🇪🇸3️⃣0️⃣4️⃣🧒', answer: 'Lamine Yamal', aliases: ['Yamal'], category: 'player', difficulty: 'medium', hint: 'Barça teenager who celebrates with his neighbourhood’s number.' },
  { id: 'p-beckham', emoji: '🌀🎯🏴󠁧󠁢󠁥󠁮󠁧󠁿', answer: 'David Beckham', aliases: ['Beckham'], category: 'player', difficulty: 'medium', hint: 'Bend it like…' },

  // ---------------- Players — hard ----------------
  { id: 'p-r9', emoji: '🇧🇷9️⃣✂️', answer: 'Ronaldo Nazário', aliases: ['Ronaldo Nazario', 'R9', 'Brazilian Ronaldo', 'Ronaldo'], category: 'player', difficulty: 'hard', hint: 'O Fenômeno — and the 2002 haircut.' },
  { id: 'p-ronaldinho', emoji: '😁🇧🇷🪄', answer: 'Ronaldinho', aliases: ['Ronaldinho Gaucho'], category: 'player', difficulty: 'hard', hint: 'Joga bonito, applauded at the Bernabéu.' },
  { id: 'p-pirlo', emoji: '🧔🍷🇮🇹', answer: 'Andrea Pirlo', aliases: ['Pirlo'], category: 'player', difficulty: 'hard', hint: 'L’architetto. Plays like he owns a vineyard — he does.' },
  { id: 'p-cruyff', emoji: '🇳🇱🔄1️⃣4️⃣', answer: 'Johan Cruyff', aliases: ['Cruyff'], category: 'player', difficulty: 'hard', hint: 'The turn is named after him. So is Total Football’s number 14.' },
  { id: 'p-buffon', emoji: '🧤🇮🇹🏆2️⃣0️⃣0️⃣6️⃣', answer: 'Gianluigi Buffon', aliases: ['Buffon', 'Gigi Buffon'], category: 'player', difficulty: 'hard', hint: 'Juventus legend between the posts, world champion in Berlin.' },
  { id: 'p-gerrard', emoji: '🔴©️⚽💥🇹🇷', answer: 'Steven Gerrard', aliases: ['Gerrard'], category: 'player', difficulty: 'hard', hint: 'Istanbul 2005 started with his header.' },

  // ---------------- Clubs — easy ----------------
  { id: 'c-manutd', emoji: '🔴😈', answer: 'Manchester United', aliases: ['Man United', 'Man Utd', 'United', 'MUFC'], category: 'club', difficulty: 'easy', hint: 'The Red Devils of Old Trafford.' },
  { id: 'c-realmadrid', emoji: '⚪👑🇪🇸', answer: 'Real Madrid', aliases: ['Madrid', 'Los Blancos'], category: 'club', difficulty: 'easy', hint: 'Fifteen-plus European Cups in white.' },
  { id: 'c-barcelona', emoji: '🔵🔴🎨', answer: 'FC Barcelona', aliases: ['Barcelona', 'Barca', 'Barça'], category: 'club', difficulty: 'easy', hint: 'Més que un club.' },
  { id: 'c-mancity', emoji: '🔵🌙', answer: 'Manchester City', aliases: ['Man City', 'City', 'MCFC'], category: 'club', difficulty: 'easy', hint: 'Their anthem is Blue Moon.' },
  { id: 'c-liverpool', emoji: '🔴🐦🚶‍♂️🚫', answer: 'Liverpool FC', aliases: ['Liverpool', 'LFC'], category: 'club', difficulty: 'easy', hint: 'You’ll never walk alone, says the bird.' },
  { id: 'c-psg', emoji: '🗼⚽', answer: 'Paris Saint-Germain', aliases: ['PSG', 'Paris SG', 'Paris'], category: 'club', difficulty: 'easy', hint: 'The Eiffel Tower is on the badge, basically.' },
  { id: 'c-arsenal', emoji: '🔴🧨📐', answer: 'Arsenal FC', aliases: ['Arsenal', 'The Gunners', 'AFC'], category: 'club', difficulty: 'easy', hint: 'There’s a cannon on the crest.' },
  { id: 'c-spurs', emoji: '🐓⚪', answer: 'Tottenham Hotspur', aliases: ['Tottenham', 'Spurs', 'THFC'], category: 'club', difficulty: 'easy', hint: 'A cockerel stands on the ball.' },

  // ---------------- Clubs — medium ----------------
  { id: 'c-juventus', emoji: '⚫⚪🦓', answer: 'Juventus', aliases: ['Juve', 'Juventus FC'], category: 'club', difficulty: 'medium', hint: 'The Old Lady runs in stripes.' },
  { id: 'c-dortmund', emoji: '🟡⚫🧱', answer: 'Borussia Dortmund', aliases: ['Dortmund', 'BVB'], category: 'club', difficulty: 'medium', hint: 'The Yellow Wall watches from the Südtribüne.' },
  { id: 'c-bayern', emoji: '🔴🇩🇪🍺', answer: 'Bayern Munich', aliases: ['Bayern', 'FC Bayern', 'Bayern München'], category: 'club', difficulty: 'medium', hint: 'Mia san mia, Oktoberfest edition.' },
  { id: 'c-westham', emoji: '⚒️🟣🟤', answer: 'West Ham United', aliases: ['West Ham', 'The Hammers'], category: 'club', difficulty: 'medium', hint: 'Crossed hammers, East London.' },
  { id: 'c-everton', emoji: '🍬🔵', answer: 'Everton', aliases: ['The Toffees', 'Everton FC'], category: 'club', difficulty: 'medium', hint: 'The Toffees of Merseyside.' },
  { id: 'c-wolves', emoji: '🐺🟠', answer: 'Wolverhampton Wanderers', aliases: ['Wolves'], category: 'club', difficulty: 'medium', hint: 'Old gold, and it’s in the name.' },
  { id: 'c-bournemouth', emoji: '🍒', answer: 'AFC Bournemouth', aliases: ['Bournemouth', 'The Cherries'], category: 'club', difficulty: 'medium', hint: 'The Cherries of the south coast.' },
  { id: 'c-brentford', emoji: '🐝🔴⚪', answer: 'Brentford', aliases: ['Brentford FC', 'The Bees'], category: 'club', difficulty: 'medium', hint: 'West London’s Bees.' },
  { id: 'c-celtic', emoji: '🍀🟢⚪', answer: 'Celtic', aliases: ['Celtic FC', 'Glasgow Celtic'], category: 'club', difficulty: 'medium', hint: 'The Hoops of Glasgow’s east end.' },
  { id: 'c-inter', emoji: '🐍⚫🔵', answer: 'Inter Milan', aliases: ['Inter', 'Internazionale'], category: 'club', difficulty: 'medium', hint: 'The Biscione serpent coils on their crest.' },

  // ---------------- Clubs — hard ----------------
  { id: 'c-valencia', emoji: '🦇🟠🇪🇸', answer: 'Valencia CF', aliases: ['Valencia'], category: 'club', difficulty: 'hard', hint: 'A bat spreads its wings over the badge.' },
  { id: 'c-atletico', emoji: '🔴⚪🐻🌳', answer: 'Atlético Madrid', aliases: ['Atletico', 'Atletico Madrid', 'Atleti'], category: 'club', difficulty: 'hard', hint: 'A bear and a strawberry tree, borrowed from the city’s coat of arms.' },
  { id: 'c-napoli', emoji: '🇮🇹🌋💙', answer: 'Napoli', aliases: ['SSC Napoli'], category: 'club', difficulty: 'hard', hint: 'Maradona’s adopted city, under the volcano.' },
  { id: 'c-marseille', emoji: '🇫🇷⚓️⚪🔵', answer: 'Olympique Marseille', aliases: ['Marseille', 'OM'], category: 'club', difficulty: 'hard', hint: 'France’s port-city giants, droit au but.' },
  { id: 'c-ajax', emoji: '🇳🇱⚔️🏛️', answer: 'Ajax', aliases: ['AFC Ajax', 'Ajax Amsterdam'], category: 'club', difficulty: 'hard', hint: 'Named for a Greek hero; famous for its academy.' },
  { id: 'c-boca', emoji: '🔵🟡🇦🇷', answer: 'Boca Juniors', aliases: ['Boca'], category: 'club', difficulty: 'hard', hint: 'La Bombonera shakes when they play.' },
  { id: 'c-river', emoji: '⚪🔴〰️🇦🇷', answer: 'River Plate', aliases: ['River'], category: 'club', difficulty: 'hard', hint: 'The red sash of El Monumental.' },

  // ---------------- Managers ----------------
  { id: 'm-mourinho', emoji: '😎🇵🇹🏆🤫', answer: 'José Mourinho', aliases: ['Mourinho', 'Jose Mourinho', 'The Special One'], category: 'manager', difficulty: 'easy', hint: 'Please don’t call him arrogant — he’s European champion.' },
  { id: 'm-pep', emoji: '👨‍🦲📋🔵🏆', answer: 'Pep Guardiola', aliases: ['Guardiola', 'Pep'], category: 'manager', difficulty: 'easy', hint: 'Bald, brilliant, and obsessed with the six-yard pass.' },
  { id: 'm-klopp', emoji: '🧢😁🤘🇩🇪', answer: 'Jürgen Klopp', aliases: ['Klopp', 'Jurgen Klopp'], category: 'manager', difficulty: 'easy', hint: 'Heavy-metal football and very white teeth.' },
  { id: 'm-ferguson', emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿⏱️🏆🏆🏆', answer: 'Alex Ferguson', aliases: ['Sir Alex Ferguson', 'Sir Alex', 'Ferguson', 'Fergie'], category: 'manager', difficulty: 'medium', hint: 'Fergie time, and the hairdryer treatment.' },
  { id: 'm-wenger', emoji: '🇫🇷🎓🧥', answer: 'Arsène Wenger', aliases: ['Wenger', 'Arsene Wenger'], category: 'manager', difficulty: 'medium', hint: 'Le Professeur, unbeaten through 2003-04.' },
  { id: 'm-ancelotti', emoji: '🇮🇹🤨🏆🏆🏆🏆🏆', answer: 'Carlo Ancelotti', aliases: ['Ancelotti', 'Carlo'], category: 'manager', difficulty: 'medium', hint: 'The eyebrow. Five Champions Leagues as a manager.' },

  // ---------------- Moments ----------------
  { id: 'mo-handofgod', emoji: '✋🇦🇷1️⃣9️⃣8️⃣6️⃣', answer: 'Diego Maradona', aliases: ['Maradona', 'Hand of God', 'The Hand of God'], category: 'moment', difficulty: 'easy', hint: '“A little with the head… and a little with the hand of God.”' },
  { id: 'mo-bite', emoji: '🦷🇺🇾🇮🇹', answer: 'Luis Suárez', aliases: ['Suarez', 'Luis Suarez', 'The Bite'], category: 'moment', difficulty: 'easy', hint: 'Chiellini has the teeth marks. World Cup 2014.' },
  { id: 'mo-headbutt', emoji: '🤕💥🇫🇷🇮🇹🏆', answer: 'Zinedine Zidane', aliases: ['Zidane', 'The Headbutt', 'Zizou'], category: 'moment', difficulty: 'easy', hint: 'His last act as a player, Berlin 2006.' },
  { id: 'mo-whyalwaysme', emoji: '❓⏰🤷🎆', answer: 'Mario Balotelli', aliases: ['Balotelli', 'Why Always Me'], category: 'moment', difficulty: 'medium', hint: 'Revealed the shirt after scoring in the Manchester derby. Also: fireworks.' },
];

/** Sanity guard used by the hook — bank must stay big enough for a daily 5. */
export const MIN_BANK_SIZE = 20;
