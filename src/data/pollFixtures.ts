/**
 * Poll of the Day fallback fixtures (item #10, superseded by daily_polls).
 *
 * Since Poll of the Day 2.0, the home page's primary poll source is the
 * public.daily_polls table (2-3 topical polls per day, seeded 60+ days out).
 * This fixture pool is now only a deterministic fallback used by
 * src/components/home/PollOfTheDay.tsx when today has no rows in daily_polls
 * (pool not seeded that far out yet, or a fetch error), so the section never
 * renders empty. Each poll has a stable `key` (used as poll_votes.poll_key,
 * never renamed once shipped or historical votes orphan), a short prompt,
 * and exactly two punchy-labeled choices.
 *
 * Style rules: every poll is exactly one named player or team against another,
 * with a short "Who you got?" or "Who ranks higher all time?" question. No
 * logos or images, flag or sport emoji only.
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
  { key: 'messi-ronaldo-prime', prompt: 'Who ranks higher all time?', a: '🇦🇷 Messi', b: '🇵🇹 Ronaldo' },
  { key: 'bulls96-warriors17', prompt: 'Who you got?', a: '🐂 1996 Bulls', b: '🌉 2017 Warriors' },
  { key: 'brady-mahomes-7games', prompt: 'Who ranks higher all time?', a: '🐐 Brady', b: '⚡ Mahomes' },
  { key: 'lebron-jordan-goat', prompt: 'Who ranks higher all time?', a: '👑 LeBron', b: '🐐 Jordan' },
  { key: 'pele-maradona', prompt: 'Who ranks higher all time?', a: '🇧🇷 Pele', b: '🇦🇷 Maradona' },
  { key: 'kobe-durant-scorer', prompt: 'Who ranks higher all time?', a: '🐍 Kobe', b: '☄️ Durant' },
  { key: 'ali-tyson-prime', prompt: 'Who ranks higher all time?', a: '🥊 Ali', b: '🥊 Tyson' },
  { key: 'ronaldo-mbappe-now', prompt: 'Who ranks higher all time?', a: '🇵🇹 Ronaldo', b: '🇫🇷 Mbappe' },
  { key: 'brady-manning', prompt: 'Who ranks higher all time?', a: '🐐 Brady', b: '🎯 Manning' },
  { key: 'gretzky-ovechkin-goals', prompt: 'Who ranks higher all time?', a: '🏒 Gretzky', b: '🚨 Ovechkin' },
  { key: 'kareem-shaq-center', prompt: 'Who ranks higher all time?', a: '🏀 Kareem', b: '🏀 Shaq' },
  { key: 'zidane-xavi-midfielder', prompt: 'Who ranks higher all time?', a: '🇫🇷 Zidane', b: '🇪🇸 Xavi' },
  { key: 'ruth-aaron-slugger', prompt: 'Who ranks higher all time?', a: '⚾ Ruth', b: '⚾ Aaron' },
  { key: 'jeter-arod-shortstop', prompt: 'Who ranks higher all time?', a: '⚾ Jeter', b: '⚾ A-Rod' },
  { key: 'lakers-celtics-rivalry', prompt: 'Who you got?', a: '💜 Lakers', b: '☘️ Celtics' },
  { key: 'realmadrid-barca', prompt: 'Who you got?', a: '⚪ Real Madrid', b: '🔵 Barcelona' },
  { key: 'manutd-liverpool', prompt: 'Who you got?', a: '🔴 Man United', b: '🔴 Liverpool' },
  { key: 'yankees-redsox', prompt: 'Who you got?', a: '⚾ Yankees', b: '⚾ Red Sox' },
  { key: 'cowboys-eagles', prompt: 'Who you got?', a: '⭐ Cowboys', b: '🦅 Eagles' },
  { key: 'packers-bears', prompt: 'Who you got?', a: '🧀 Packers', b: '🐻 Bears' },
  { key: 'iverson-crossover', prompt: 'Who ranks higher all time?', a: '🔟 Iverson', b: '🌀 Kyrie' },
  { key: 'griffey-bonds-swing', prompt: 'Who ranks higher all time?', a: '⚾ Griffey', b: '⚾ Bonds' },
  { key: 'montana-brady-clutch', prompt: 'Who ranks higher all time?', a: '🕹️ Montana', b: '🐐 Brady' },
  { key: 'ronaldinho-neymar-flair', prompt: 'Who ranks higher all time?', a: '🇧🇷 Ronaldinho', b: '🇧🇷 Neymar' },
  { key: 'shaq-kobe-lakers-breakup', prompt: 'Who ranks higher all time?', a: '🏀 Shaq', b: '🐍 Kobe' },
  { key: 'manning-brady-brothers', prompt: 'Who ranks higher all time?', a: '🎯 Peyton', b: '🎯 Eli' },
  { key: 'lionel-messi-vs-diego-maradona-wc', prompt: 'Who ranks higher all time?', a: '🇦🇷 Messi', b: '🇦🇷 Maradona' },
  { key: 'serena-navratilova-goat', prompt: 'Who ranks higher all time?', a: '🎾 Serena', b: '🎾 Navratilova' },
  { key: 'f1-verstappen-hamilton', prompt: 'Who ranks higher all time?', a: '🏎️ Verstappen', b: '🏎️ Hamilton' },
  { key: 'f1-senna-schumacher', prompt: 'Who ranks higher all time?', a: '🇧🇷 Senna', b: '🇩🇪 Schumacher' },
  { key: 'ufc-gsp-silva', prompt: 'Who ranks higher all time?', a: '🥋 GSP', b: '🥊 Silva' },
  { key: 'mcgregor-khabib', prompt: 'Who ranks higher all time?', a: '🍀 McGregor', b: '🐺 Khabib' },
  { key: 'nascar-earnhardt-johnson', prompt: 'Who ranks higher all time?', a: '🏁 Earnhardt', b: '🏁 Johnson' },
];
