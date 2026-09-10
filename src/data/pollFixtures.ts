/**
 * Poll of the Day fallback fixtures (item #10, superseded by daily_polls).
 *
 * Since Poll of the Day 2.0, the home page's primary poll source is the
 * public.daily_polls table (2-3 topical polls per day, seeded 60+ days out).
 * This fixture pool is now only a deterministic fallback used by
 * src/components/home/PollOfTheDay.tsx when today has no rows in daily_polls
 * (pool not seeded that far out yet, or a fetch error), so the section never
 * renders empty. Each poll has a stable `key` (used as poll_votes.poll_key,
 * never renamed once shipped or historical votes orphan), a prompt with some
 * character, and two to four short choices.
 *
 * Style rules (Round 521, from the owner's own words on 2026-09-10 and
 * 2026-08-16, held by src/data/pollFixtures.test.ts and
 * scripts/simPollCharacter.mjs):
 *   - the QUESTION carries the character: a scenario, a hook, a hot take,
 *     one sentence ending in a question mark, and not the same string on
 *     every row;
 *   - the CHOICES stay short: a name, a team, Yes or No, at most three words,
 *     never a sentence, never a joke option;
 *   - no em or en dashes, no logos or images, flag or sport emoji only.
 */

export interface PollFixture {
  /** Stable identifier stored as poll_votes.poll_key. Never rename in place. */
  key: string;
  /** The question shown above the choices. */
  prompt: string;
  /** Left/first choice. */
  a: string;
  /** Right/second choice. */
  b: string;
  /** Optional third and fourth choices. */
  c?: string;
  d?: string;
}

export const POLLS: PollFixture[] = [
  { key: 'messi-ronaldo-prime', prompt: 'Prime Messi or prime Ronaldo, one season to win you the league?', a: '🇦🇷 Messi', b: '🇵🇹 Ronaldo' },
  { key: 'bulls96-warriors17', prompt: '96 Bulls or 17 Warriors, a best of seven, who takes it?', a: '🐂 96 Bulls', b: '🌉 17 Warriors' },
  { key: 'brady-mahomes-7games', prompt: 'Brady or Mahomes, seven games to save your life?', a: '🐐 Brady', b: '⚡ Mahomes' },
  { key: 'lebron-jordan-goat', prompt: 'LeBron or Jordan, and you have to pick?', a: '👑 LeBron', b: '🐐 Jordan' },
  { key: 'pele-maradona', prompt: 'Pele or Maradona, who do you show a kid first?', a: '🇧🇷 Pele', b: '🇦🇷 Maradona' },
  { key: 'kobe-durant-scorer', prompt: 'Down one, five seconds left, who is taking the shot?', a: '🐍 Kobe', b: '☄️ Durant' },
  { key: 'usain-bolt-vs-field', prompt: 'Prime Bolt in a 100m final today, does he still win?', a: '⚡ Yes', b: '🏃 No' },
  { key: 'ali-tyson-prime', prompt: 'Prime Ali or prime Tyson, fifteen rounds, who wins?', a: '🥊 Ali', b: '🥊 Tyson' },
  { key: 'ronaldo-mbappe-now', prompt: 'Ronaldo at 25 or Mbappe right now?', a: '🇵🇹 Ronaldo', b: '🇫🇷 Mbappe' },
  { key: 'curry-shooter-goat', prompt: 'Is Curry the best shooter who ever lived?', a: '🎯 Yes', b: '🏀 No' },
  { key: 'brady-manning', prompt: 'Brady or Peyton, who do you want calling the audible?', a: '🐐 Brady', b: '🎯 Manning' },
  { key: 'federer-nadal-djokovic', prompt: 'One match to save your life, which of the big three?', a: '🎾 Federer', b: '🎾 Nadal', c: '🎾 Djokovic' },
  { key: 'gretzky-ovechkin-goals', prompt: 'Gretzky or Ovechkin, the better pure goal scorer?', a: '🏒 Gretzky', b: '🚨 Ovechkin' },
  { key: 'kareem-shaq-center', prompt: 'Kareem or Shaq, one center for a whole career?', a: '🏀 Kareem', b: '🏀 Shaq' },
  { key: 'zidane-xavi-midfielder', prompt: 'Zidane or Xavi, who runs your midfield?', a: '🇫🇷 Zidane', b: '🇪🇸 Xavi' },
  { key: 'jordan-lebron-clutch', prompt: 'Game seven, last possession, whose hands?', a: '🐐 Jordan', b: '👑 LeBron' },
  { key: 'ruth-aaron-slugger', prompt: 'Babe Ruth or Hank Aaron, one swing to win the series?', a: '⚾ Ruth', b: '⚾ Aaron' },
  { key: 'jeter-arod-shortstop', prompt: 'Jeter or A-Rod, who do you want at short in October?', a: '⚾ Jeter', b: '⚾ A-Rod' },
  { key: 'lakers-celtics-rivalry', prompt: 'Lakers or Celtics, the greater franchise?', a: '💜 Lakers', b: '☘️ Celtics' },
  { key: 'realmadrid-barca', prompt: 'El Clasico for the title, who do you back?', a: '⚪ Real Madrid', b: '🔵 Barcelona' },
  { key: 'manutd-liverpool', prompt: 'Man United or Liverpool, the bigger club right now?', a: '🔴 Man United', b: '🔴 Liverpool' },
  { key: 'yankees-redsox', prompt: 'Yankees or Red Sox, game seven at Fenway, who wins?', a: '⚾ Yankees', b: '⚾ Red Sox' },
  { key: 'cowboys-eagles', prompt: 'Cowboys or Eagles, Sunday night in January, who wins?', a: '⭐ Cowboys', b: '🦅 Eagles' },
  { key: 'packers-bears', prompt: 'Packers or Bears at Lambeau in the snow?', a: '🧀 Packers', b: '🐻 Bears' },
  { key: 'iverson-crossover', prompt: 'Iverson or Kyrie, the best handles you ever saw?', a: '🔟 Iverson', b: '🌀 Kyrie' },
  { key: 'griffey-bonds-swing', prompt: 'Griffey or Bonds, the prettier swing?', a: '⚾ Griffey', b: '⚾ Bonds' },
  { key: 'montana-brady-clutch', prompt: 'Montana or Brady, one Super Bowl drive, who leads it?', a: '🕹️ Montana', b: '🐐 Brady' },
  { key: 'ronaldinho-neymar-flair', prompt: 'Ronaldinho or Neymar, more fun to watch?', a: '🇧🇷 Ronaldinho', b: '🇧🇷 Neymar' },
  { key: 'shaq-kobe-lakers-breakup', prompt: 'Shaq or Kobe, who do you build the three peat around?', a: '🏀 Shaq', b: '🐍 Kobe' },
  { key: 'nadal-clay-goat', prompt: 'Is Nadal on clay the most dominant thing in sports?', a: '🎾 Yes', b: '🏆 No' },
  { key: 'manning-brady-brothers', prompt: 'Peyton or Eli, who do you want in a Super Bowl?', a: '🎯 Peyton', b: '🎯 Eli' },
  { key: 'sixman-vs-starter-value', prompt: 'Great sixth man or average starter, which would you rather have?', a: '🔥 Sixth man', b: '🏀 Starter' },
  { key: 'serena-navratilova-goat', prompt: "Serena or Navratilova, the women's tennis GOAT?", a: '🎾 Serena', b: '🎾 Navratilova' },
  { key: 'f1-verstappen-hamilton', prompt: 'Verstappen or Hamilton, equal cars, one season, who wins?', a: '🏎️ Verstappen', b: '🏎️ Hamilton' },
  { key: 'f1-senna-schumacher', prompt: 'Senna or Schumacher, one lap of Monaco in the wet?', a: '🇧🇷 Senna', b: '🇩🇪 Schumacher' },
  { key: 'ufc-gsp-silva', prompt: 'GSP or Anderson Silva, the fight we never got, who wins?', a: '🥋 GSP', b: '🥊 Silva' },
  { key: 'ovechkin-gretzky-record', prompt: 'Ovechkin passing Gretzky on goals, does it change the GOAT talk?', a: '🚨 Yes', b: '🏒 No' },
  { key: 'prem-title-four', prompt: 'A four horse title race, who do you back?', a: 'Arsenal', b: 'Liverpool', c: 'Man City', d: 'Chelsea' },
  { key: 'nba-dynasty-four', prompt: 'The best NBA team ever, pick a dynasty?', a: '96 Bulls', b: '17 Warriors', c: '86 Celtics', d: '87 Lakers' },
  { key: 'wc-final-four', prompt: 'The best World Cup final you ever watched?', a: '2022', b: '2014', c: '2006', d: '1998' },
];
