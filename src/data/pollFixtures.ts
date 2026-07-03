/**
 * Poll of the Day fixtures (item #10).
 *
 * Hand-curated evergreen matchup polls. Each poll has a stable `key` (used as
 * poll_votes.poll_key, never renamed once shipped or historical votes orphan),
 * a short prompt, and exactly two punchy-labeled choices.
 *
 * Rotation: PollOfTheDay picks `POLLS[dateSeed(getTodayET()) % POLLS.length]`,
 * the same daily-seed convention as the rest of the site (see src/lib/dateUtils.ts).
 *
 * Style rules: no em dashes, plain conversational phrasing, no logos/images,
 * flag or sport emoji only.
 */

export interface PollFixture {
  /** Stable identifier stored as poll_votes.poll_key. Never rename in place. */
  key: string;
  /** The matchup question shown above the two choices. */
  prompt: string;
  /** Left/first choice. */
  a: string;
  /** Right/second choice. */
  b: string;
}

export const POLLS: PollFixture[] = [
  { key: 'messi-ronaldo-prime', prompt: 'Prime Messi or prime Ronaldo?', a: '🇦🇷 Prime Messi', b: '🇵🇹 Prime Ronaldo' },
  { key: 'bulls96-warriors17', prompt: '1996 Bulls or 2017 Warriors?', a: '🐂 96 Bulls', b: '🌉 17 Warriors' },
  { key: 'brady-mahomes-7games', prompt: 'Brady or Mahomes, seven games to save your life?', a: '🐐 Brady', b: '⚡ Mahomes' },
  { key: 'lebron-jordan-goat', prompt: 'Basketball GOAT?', a: '👑 LeBron', b: '🐐 Jordan' },
  { key: 'pele-maradona', prompt: 'Pele or Maradona?', a: '🇧🇷 Pele', b: '🇦🇷 Maradona' },
  { key: 'kobe-durant-scorer', prompt: 'Who would you want taking the last shot?', a: '🐍 Kobe', b: '☄️ Durant' },
  { key: 'usain-bolt-vs-field', prompt: 'Prime Usain Bolt in a 100m race today, does he still win?', a: '⚡ Yes, easy', b: '🏃 No, field caught up' },
  { key: 'ali-tyson-prime', prompt: 'Prime Ali or prime Tyson?', a: '🥊 Ali', b: '🥊 Tyson' },
  { key: 'ronaldo-mbappe-now', prompt: 'Ronaldo or Mbappe right now?', a: '🇵🇹 Ronaldo', b: '🇫🇷 Mbappe' },
  { key: 'curry-shooter-goat', prompt: 'Curry or anyone else, greatest shooter ever?', a: '🎯 Curry', b: '🏀 Someone else' },
  { key: 'brady-manning', prompt: 'Brady or Peyton Manning?', a: '🐐 Brady', b: '🎯 Manning' },
  { key: 'federer-nadal-djokovic', prompt: 'Federer, Nadal, or Djokovic, pick one to win one match for you?', a: '🎾 Federer or Nadal', b: '🎾 Djokovic' },
  { key: 'gretzky-ovechkin-goals', prompt: 'Gretzky or Ovechkin, better goal scorer?', a: '🏒 Gretzky', b: '🚨 Ovechkin' },
  { key: 'kareem-shaq-center', prompt: 'Kareem or Shaq, best center?', a: '🏀 Kareem', b: '🏀 Shaq' },
  { key: 'zidane-xavi-midfielder', prompt: 'Zidane or Xavi, best midfielder?', a: '🇫🇷 Zidane', b: '🇪🇸 Xavi' },
  { key: 'jordan-lebron-clutch', prompt: 'Who do you want with the ball down one, five seconds left?', a: '🐐 Jordan', b: '👑 LeBron' },
  { key: 'ruth-aaron-slugger', prompt: 'Babe Ruth or Hank Aaron?', a: '⚾ Ruth', b: '⚾ Aaron' },
  { key: 'jeter-arod-shortstop', prompt: 'Jeter or A-Rod?', a: '⚾ Jeter', b: '⚾ A-Rod' },
  { key: 'lakers-celtics-rivalry', prompt: 'Lakers or Celtics, the better franchise all time?', a: '💜 Lakers', b: '☘️ Celtics' },
  { key: 'realmadrid-barca', prompt: 'Real Madrid or Barcelona?', a: '⚪ Real Madrid', b: '🔵 Barcelona' },
  { key: 'manutd-liverpool', prompt: 'Man United or Liverpool?', a: '🔴 Man United', b: '🔴 Liverpool' },
  { key: 'yankees-redsox', prompt: 'Yankees or Red Sox?', a: '⚾ Yankees', b: '⚾ Red Sox' },
  { key: 'cowboys-eagles', prompt: 'Cowboys or Eagles?', a: '⭐ Cowboys', b: '🦅 Eagles' },
  { key: 'packers-bears', prompt: 'Packers or Bears?', a: '🧀 Packers', b: '🐻 Bears' },
  { key: 'messi-worldcup22-best', prompt: 'Messi 2022 or any single World Cup run ever, the best?', a: '🇦🇷 Messi 2022', b: '🌍 Someone else' },
  { key: 'brady-6rings-context', prompt: 'Does having 7 rings settle the Brady GOAT debate?', a: '🐐 Yes, case closed', b: '🤔 Rings alone do not settle it' },
  { key: 'nba-vs-euroleague-star', prompt: 'A young star today, NBA or EuroLeague first?', a: '🇺🇸 NBA', b: '🇪🇺 EuroLeague' },
  { key: 'messi-goldenboots', prompt: 'Messi or Ronaldo, more Golden Boots matters more?', a: '🇦🇷 Messi', b: '🇵🇹 Ronaldo' },
  { key: 'iverson-crossover', prompt: 'Iverson or Kyrie, best handles ever?', a: '🔟 Iverson', b: '🌀 Kyrie' },
  { key: 'griffey-bonds-swing', prompt: 'Griffey or Bonds, prettier swing?', a: '⚾ Griffey', b: '⚾ Bonds' },
  { key: 'montana-brady-clutch', prompt: 'Montana or Brady, more clutch in a Super Bowl?', a: '🕹️ Montana', b: '🐐 Brady' },
  { key: 'ronaldinho-neymar-flair', prompt: 'Ronaldinho or Neymar, more fun to watch?', a: '🇧🇷 Ronaldinho', b: '🇧🇷 Neymar' },
  { key: 'messi-inter-miami', prompt: 'Does Messi joining Inter Miami help American soccer long term?', a: '📈 Yes, big time', b: '🤷 Not really' },
  { key: 'wilt-100-vs-modern', prompt: 'Wilt scoring 100 in a game, could anyone do that today?', a: '💯 Yes, someone could', b: '🚫 Never happens again' },
  { key: 'kingjames-decision', prompt: 'The Decision in 2010, fair or foul?', a: '😬 Foul, handled badly', b: '🤝 Fair, his choice' },
  { key: 'messi-ronaldo-legacy-club', prompt: 'Whose club legacy matters more, Messi at Barca or Ronaldo at United?', a: '🔵 Messi at Barca', b: '🔴 Ronaldo at United' },
  { key: 'shaq-kobe-lakers-breakup', prompt: 'Shaq or Kobe, who was more at fault for the Lakers breakup?', a: '🏀 Shaq', b: '🐍 Kobe' },
  { key: 'nadal-clay-goat', prompt: 'Is Nadal on clay the single most dominant thing in sports?', a: '🎾 Yes, nothing compares', b: '🏆 No, other things rival it' },
  { key: 'ovechkin-gretzky-record', prompt: 'Ovechkin passing Gretzky on goals, does it change the GOAT talk?', a: '🚨 Yes, it should', b: '🏒 No, Gretzky still the GOAT' },
  { key: 'manning-brady-brothers', prompt: 'Peyton or Eli, better big game performance?', a: '🎯 Peyton', b: '🎯 Eli' },
  { key: 'ronaldo-portugal-euro16', prompt: 'Ronaldo getting hurt in the Euro 2016 final, biggest what if?', a: '🤕 Yes, changed everything', b: '⚽ Portugal still would have won' },
  { key: 'sixman-vs-starter-value', prompt: 'Would you rather have a great sixth man or an average starter?', a: '🔥 Great sixth man', b: '🏀 Average starter' },
  { key: 'defense-wins-championships', prompt: 'Defense or offense, which wins championships?', a: '🛡️ Defense', b: '🎯 Offense' },
  { key: 'college-vs-nfl-atmosphere', prompt: 'College football or NFL, better atmosphere?', a: '🎓 College', b: '🏈 NFL' },
  { key: 'wrestlemania-vs-superbowl-hype', prompt: 'Bigger single day hype, Super Bowl or a World Cup final?', a: '🏈 Super Bowl', b: '🌍 World Cup final' },
  { key: 'messi-freekick-ronaldo-header', prompt: 'Messi free kicks or Ronaldo headers, which skill is rarer?', a: '🎯 Messi free kicks', b: '🦅 Ronaldo headers' },
  { key: 'olympics-vs-worldcup-prestige', prompt: 'Olympic gold or a World Cup, bigger prize for a soccer player?', a: '🥇 Olympic gold', b: '🏆 World Cup' },
  { key: 'jordan-flu-game', prompt: 'The Flu Game, still the gutsiest performance in sports?', a: '🤒 Yes, nothing tops it', b: '💪 Something else tops it' },
  { key: 'messi-barca-return', prompt: 'Would a Messi return to Barcelona one day make sense?', a: '🔵 Yes, fitting ending', b: '🚫 No, chapter is closed' },
  { key: 'hockey-fighting-keep', prompt: 'Should fighting stay part of hockey?', a: '🥊 Yes, keep it', b: '🚫 No, remove it' },
  { key: 'kd-warriors-ring-asterisk', prompt: 'Durant joining the 73 win Warriors, does it put an asterisk on his rings?', a: '⭐ Yes, a little', b: '💍 No, rings are rings' },
  { key: 'messi-ballondor-count', prompt: 'Does winning the most Ballon d\'Ors settle the GOAT debate on its own?', a: '🏆 Yes, it is the top individual award', b: '🤔 No, team success matters too' },
  { key: 'underdog-vs-dynasty', prompt: 'Which is more fun to watch, a dynasty or an underdog run?', a: '👑 A dynasty', b: '🐊 An underdog run' },
  { key: 'lionel-messi-vs-diego-maradona-wc', prompt: 'Whose World Cup run mattered more for their country, Messi 2022 or Maradona 1986?', a: '🇦🇷 Messi 2022', b: '🇦🇷 Maradona 1986' },
  { key: 'nba-3point-era-vs-90s', prompt: 'Which era of basketball is more fun, todays three point game or 90s physical ball?', a: '🎯 Todays three point game', b: '💪 90s physical ball' },
  { key: 'penalty-shootout-fair', prompt: 'Are penalty shootouts a fair way to decide a big soccer match?', a: '🎯 Yes, it is fine', b: '😩 No, there is a better way' },
  { key: 'brady-belichick-credit', prompt: 'The Patriots dynasty, more credit to Brady or Belichick?', a: '🐐 Brady', b: '🧠 Belichick' },
  { key: 'college-playoff-format', prompt: 'Do you like the expanded College Football Playoff format?', a: '👍 Yes, more teams is better', b: '👎 No, prefer it smaller' },
  { key: 'messi-worldcup-before-2022', prompt: 'Before 2022, was the lack of a World Cup a real knock on Messi?', a: '⚠️ Yes, it was fair criticism', b: '🚫 No, never mattered' },
  { key: 'tigerwoods-prime-vs-field', prompt: 'Prime Tiger Woods against the best golfers today, who wins more?', a: '🐯 Prime Tiger', b: '⛳ Todays best field' },
  { key: 'serena-navratilova-goat', prompt: 'Serena or Navratilova, tennis GOAT?', a: '🎾 Serena', b: '🎾 Navratilova' },
  { key: 'messi-argentina-2014-final', prompt: 'Argentina losing the 2014 final, biggest heartbreak of Messis career?', a: '😢 Yes, the toughest one', b: '🏆 2022 erased it completely' },
  { key: 'f1-verstappen-hamilton', prompt: 'Verstappen or Hamilton, who wins a fair fight in equal cars?', a: '🏎️ Verstappen', b: '🏎️ Hamilton' },
  { key: 'f1-senna-schumacher', prompt: 'Senna or Schumacher, F1 GOAT?', a: '🇧🇷 Senna', b: '🇩🇪 Schumacher' },
  { key: 'ufc-gsp-silva', prompt: 'GSP or Anderson Silva, UFC GOAT?', a: '🥋 GSP', b: '🥊 Silva' },
  { key: 'mcgregor-khabib', prompt: 'McGregor or Khabib, who wins a rematch today?', a: '🍀 McGregor', b: '🐺 Khabib' },
  { key: 'nascar-earnhardt-johnson', prompt: 'Dale Earnhardt or Jimmie Johnson, NASCAR GOAT?', a: '🏁 Earnhardt', b: '🏁 Johnson' },
  { key: 'messi-training-work-ethic', prompt: 'Is natural talent or work ethic the bigger reason for Messis success?', a: '✨ Natural talent', b: '💪 Work ethic' },
  { key: 'olympics-basketball-dreamteam', prompt: 'The 1992 Dream Team or a modern Team USA squad, who wins?', a: '🇺🇸 1992 Dream Team', b: '🇺🇸 A modern squad' },
  { key: 'messi-vs-ronaldo-bicyclekick', prompt: 'Messis Panenka or Ronaldos bicycle kick, better signature moment?', a: '🎯 Messis Panenka', b: '🚲 Ronaldos bicycle kick' },
  { key: 'super-bowl-halftime-vs-game', prompt: 'What do you watch the Super Bowl for more, the game or the halftime show?', a: '🏈 The game', b: '🎤 The halftime show' },
  { key: 'baseball-pace-of-play', prompt: 'Has the pitch clock made baseball better?', a: '⏱️ Yes, much better', b: '😕 No, prefer the old pace' },
  { key: 'messi-ronaldo-club-vs-country', prompt: 'Messi at club level or Ronaldo for his country, whose peak was higher?', a: '🔵 Messi at club level', b: '🇵🇹 Ronaldo for his country' },
];
