import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import {
  MLB_POSTSEASON_PERIODS, MLB_POSTSEASON_SOURCES, MLB_SERIES_LENGTHS, MLB_POSTSEASON_VERIFIED_ON,
  seasonRange, sourceById,
} from '@/lib/mlbPostseasonFormatHistory';

/**
 * Round 533: the fourth reference explainer, same shape as Round 522's NFL
 * page. Static, no clock, no database, and it imports nothing from the MLB
 * Front Office engine: the prerendered snapshot is the whole page.
 */

const LINK = 'inline-flex items-center min-h-[32px] text-primary hover:underline';

const RELATED = [
  { path: '/mlb-front-office', label: 'MLB Front Office', why: 'run a club through the real twelve team bracket, byes and all' },
  { path: '/mlb-my-career', label: 'MLB My Career', why: 'a whole career from the player\'s side of the clubhouse' },
  { path: '/missing-nine', label: 'Missing Nine', why: 'a real World Series lineup with one name blanked' },
  { path: '/mlb-grid', label: 'MLB Franchise Grid', why: 'the daily 3x3 knowledge puzzle' },
  { path: '/records#ws', label: 'The Record Books', why: 'every World Series winner since 1903, with 1904 and 1994 left empty on purpose' },
  { path: '/baseball', label: 'All the baseball games', why: 'the whole section on one page' },
];

const FAQS = [
  {
    q: 'How many teams make the MLB playoffs?',
    a: 'Twelve, since 2022: six per league, the three division winners and three wild cards. The two division winners with the best records skip the first round. The other four clubs in each league play a best of three Wild Card Series, 3 seed against 6 and 4 against 5, with every game at the higher seed\'s park.',
  },
  {
    q: 'When did baseball first have playoffs before the World Series?',
    a: '1969. Each league split into East and West divisions and the two division winners played a best of five League Championship Series for the pennant. Before that, from 1903, the pennant went to the best regular season record and the only postseason series was the World Series itself.',
  },
  {
    q: 'Which years had no World Series?',
    a: 'Two since 1903. In 1904 the Giants refused to play the American League champion, and the series has been played every year since 1905 with one exception. In 1994 the players\' strike cancelled the whole postseason, which is why the three division, wild card format adopted that year was not played until 1995.',
  },
  {
    q: 'What happened to the Wild Card Game?',
    a: 'It ran from 2012 to 2019 and once more in 2021: the two wild cards in each league played a single game for a place in the Division Series. The 2022 agreement replaced it with a best of three Wild Card Series and added a third wild card, so four clubs per league now play that round while the top two division winners rest.',
  },
];

const MlbPostseasonFormatHistory = () => {
  const sourceIds = [...new Set([...MLB_POSTSEASON_PERIODS.flatMap(p => p.sources), ...MLB_SERIES_LENGTHS.sources])];
  const sources = sourceIds.map(sourceById).filter((s): s is NonNullable<typeof s> => !!s);
  const publishers = new Set(MLB_POSTSEASON_SOURCES.map(s => s.publisher)).size;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="MLB Postseason Format History: Every Change Since 1903 | DoUKnowBall"
        description="Every MLB postseason format change since 1903, one World Series to a twelve club bracket, the two Octobers with no series, and how long each round has been."
        path="/mlb-postseason-format-history"
      />
      <GameNavbar />
      <main id="dukb-main" tabIndex={-1} className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-foreground">MLB postseason format history</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Every shape the baseball postseason has taken since the first modern World Series in 1903, the two years it was not played, and how long each round has been. Each change was checked against two independent publishers on {MLB_POSTSEASON_VERIFIED_ON}, listed at the bottom. Where a detail only had one reading it was left out rather than guessed, and the bottom of the page says which.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">The timeline at a glance</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50 text-left">
                  <th className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">Seasons</th>
                  <th className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">Field</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Qualifying</th>
                </tr>
              </thead>
              <tbody>
                {MLB_POSTSEASON_PERIODS.map(p => (
                  <tr key={p.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{seasonRange(p)}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{p.fieldSize} clubs</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{p.qualifying}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">Season by season</h2>
          <div className="space-y-4">
            {MLB_POSTSEASON_PERIODS.map(p => (
              <article key={p.id} id={p.id} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-base font-bold text-foreground">{seasonRange(p)}: {p.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.qualifying}</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                  {p.notes.map(n => <li key={n}>{n}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-2">How long each round has been</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{MLB_SERIES_LENGTHS.text}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-1">What MLB Front Office plays</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The current format and only the current format: in each league the three division winners are seeded 1 to 3 and three wild cards 4 to 6, the top two seeds sit out the first round, the 3 seed plays the 6 and the 4 plays the 5 in best of three Wild Card Series, the 1 seed then meets the 4 against 5 winner and the 2 seed the 3 against 6 winner in a best of five Division Series, and the League Championship Series and World Series are best of seven. The season underneath is 162 games in shape (27 rounds of six) on real 2026 rosters. It does not offer a past era, so there is no older bracket to compare against.
          </p>
          <p className="text-xs mt-3">
            <Link to="/mlb-front-office" className={LINK}>Run a club through it</Link>
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">Questions people ask</h2>
          <div className="space-y-4">
            {FAQS.map(f => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-2">Where this comes from</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Every change above rests on at least two independent publishers agreeing: Wikipedia's postseason, World Series, wild card and League Championship Series pages, cross-checked against Baseball Almanac's year by year charts, MLB.com's own format FAQ, ESPN's wild card explainer and CBS Sports' report of the 2020 agreement. {sources.length} sources across {publishers} publishers, last checked {MLB_POSTSEASON_VERIFIED_ON}.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Three details had only one reading and are not on this page: how long the extra 1981 strike round was, the 1995 to 2011 rule about a wild card and its own division winner meeting early, and how many clubs each league had in 1969. Baseball Reference, the Hall of Fame and four MLB.com history pages could not be fetched on the day, so none of them is cited.
          </p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-5">
            {sources.map(s => (
              <li key={s.id}>
                {s.publisher}, <a href={s.url} target="_blank" rel="noopener noreferrer" className={LINK}>{s.title}</a>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-foreground mb-3">Play with this history</h2>
          <ul className="space-y-1 text-sm">
            {RELATED.map(r => (
              <li key={r.path}>
                <Link to={r.path} className={`${LINK} font-semibold`}>{r.label}</Link>
                <span className="text-muted-foreground">: {r.why}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default MlbPostseasonFormatHistory;
