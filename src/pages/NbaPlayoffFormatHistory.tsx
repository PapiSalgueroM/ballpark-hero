import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import {
  NBA_PLAYOFF_PERIODS, NBA_PLAYOFF_SOURCES, NBA_LOTTERY, NBA_PLAYOFF_VERIFIED_ON,
  seasonRange, sourceById,
} from '@/lib/nbaPlayoffFormatHistory';

/**
 * Round 532: the third reference explainer, same shape as Round 522's NFL
 * page. Static, no clock, no database: the prerendered snapshot is the whole
 * page.
 */

const LINK = 'inline-flex items-center min-h-[32px] text-primary hover:underline';

const RELATED = [
  { path: '/nba-front-office', label: 'NBA Front Office', why: 'run a franchise through the real play-in and four best of seven rounds' },
  { path: '/nba-my-career', label: 'NBA My Career', why: 'draft night to the rafters from a player\'s seat' },
  { path: '/conquest-nba', label: 'NBA Conquest', why: 'the map game, a franchise a day' },
  { path: '/nba-grid', label: 'NBA Franchise Grid', why: 'the daily 3x3 knowledge puzzle' },
  { path: '/records#nba', label: 'The Record Books', why: 'every NBA champion since 1947, year by year' },
  { path: '/pro-basketball', label: 'All the basketball games', why: 'the whole section on one page' },
];

const FAQS = [
  {
    q: 'How many teams make the NBA playoffs?',
    a: 'Sixteen, eight per conference, since the 1984 playoffs. Since 2021 the top six in each conference qualify outright and the seventh through tenth placed teams play a play-in for the last two seeds, so twenty teams are still alive when the regular season ends, but only sixteen enter the bracket.',
  },
  {
    q: 'When did the first round become best of seven?',
    a: 'The 2003 playoffs. From 1984 to 2002 the first round was best of five, and before that, from 1975, it was best of three. Every round has been best of seven since 2003, which is why a champion needs sixteen wins.',
  },
  {
    q: 'Do division winners still get a top seed?',
    a: 'No. From the 2015-16 season the eight playoff teams in each conference are seeded purely by record. Between 2004-05 and 2014-15 a division winner was guaranteed a seed no lower than a floor whatever its record, a top three seed for the first two seasons and a top four seed after that, which is how a 51 win Portland team took the fourth seed in the West in 2015 with the sixth best record in the conference.',
  },
  {
    q: 'How does the NBA draft lottery work now?',
    a: 'Through the 2026 draft: fourteen non-playoff teams, fourteen numbered balls, four drawn at a time, 1,000 of the 1,001 possible combinations shared out by record, with the three worst teams holding 14 percent each and the draw deciding the first four picks. From the 2027 draft the pool grows to sixteen teams because the two No. 8 seeds that come through the play-in stay in it, and the three worst records hold two balls each against three for the teams just above them.',
  },
];

const NbaPlayoffFormatHistory = () => {
  const sourceIds = [...new Set([...NBA_PLAYOFF_PERIODS.flatMap(p => p.sources), ...NBA_LOTTERY.eras.flatMap(e => e.sources)])];
  const sources = sourceIds.map(sourceById).filter((s): s is NonNullable<typeof s> => !!s);
  const publishers = new Set(NBA_PLAYOFF_SOURCES.map(s => s.publisher)).size;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="NBA Playoff Format History: Every Change Since 1946-47 | DoUKnowBall"
        description="Every NBA playoff format change since 1946-47, from six BAA teams to sixteen plus a play-in, and the draft lottery from the coin flip to the 3-2-1 lottery."
        path="/nba-playoff-format-history"
      />
      <GameNavbar />
      <main id="dukb-main" tabIndex={-1} className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-foreground">NBA playoff format history</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Every shape the NBA postseason has taken since the BAA's first season in 1946-47, and the draft lottery's own changes, because the two have always pulled on each other. Each was checked against two independent publishers on {NBA_PLAYOFF_VERIFIED_ON}, listed at the bottom. Where a detail only had one reading it was left out rather than guessed, and the one date the sources disagree on is left as a disagreement.
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
                {NBA_PLAYOFF_PERIODS.map(p => (
                  <tr key={p.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{seasonRange(p)}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{p.fieldSize} teams</td>
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
            {NBA_PLAYOFF_PERIODS.map(p => (
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
          <h2 className="text-lg font-display font-bold text-foreground mb-2">The draft lottery</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{NBA_LOTTERY.intro}</p>
          <div className="space-y-4">
            {NBA_LOTTERY.eras.map(e => (
              <article key={e.id} id={`lottery-${e.id}`} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-base font-bold text-foreground">{e.year}: {e.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{e.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-1">What the games play</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            NBA Front Office plays the current format and nothing older: the top six in each conference go straight in, seventh through tenth play the real play-in, and the sixteen that come out of it play four best of seven rounds. Its draft has no lottery. NBA My Career hands the rookie a draft slot from how good the prospect is, with no lottery odds behind it, and NBA Conquest has no draft at all, so none of the three models the odds described above.
          </p>
          <p className="text-xs mt-3">
            <Link to="/nba-front-office" className={LINK}>Run a franchise through it</Link>
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
            Every change above rests on at least two independent publishers agreeing: Wikipedia's playoffs, season and lottery pages cross-checked against NBA.com's own history pieces and press releases, ESPN, FanSided, TickPick, Land of Basketball and Sports Illustrated. Basketball Reference, Wikipedia's 1985 draft lottery page and two CBC stories were attempted and blocked, so none of them is cited. NBA.com dates the lottery's cut to three picks to 1986 and Wikipedia to 1987; the page says neither. {sources.length} sources across {publishers} publishers, last checked {NBA_PLAYOFF_VERIFIED_ON}.
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

export default NbaPlayoffFormatHistory;
