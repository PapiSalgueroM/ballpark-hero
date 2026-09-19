import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import ReferenceSources from '@/components/seo/ReferenceSources';
import {
  NFL_PLAYOFF_PERIODS, NFL_PLAYOFF_SOURCES, NFL_OVERTIME, NFL_PLAYOFF_VERIFIED_ON,
  seasonRange, sourceById,
} from '@/lib/nflPlayoffFormatHistory';

/**
 * Round 522: the second reference explainer, same shape as Round 520's
 * Champions League page. Static, no clock, no database: the prerendered
 * snapshot is the whole page.
 */

const LINK = 'inline-flex items-center min-h-[32px] text-primary hover:underline';

const RELATED = [
  { path: '/front-office', label: 'NFL Front Office', why: 'run a club through the modern 14 team bracket, first round bye and all' },
  { path: '/nfl-my-career', label: 'NFL My Career', why: 'play a career through this era from a player\'s seat' },
  { path: '/missing-eleven', label: 'Missing Eleven', why: 'a real Super Bowl starting lineup, one name blanked' },
  { path: '/football-grid', label: 'NFL Grid', why: 'the daily 3x3 knowledge puzzle' },
  { path: '/records', label: 'The Record Books', why: 'every Super Bowl champion, year by year' },
  { path: '/pro-football', label: 'All the football games', why: 'the whole section on one page' },
];

const FAQS = [
  {
    q: 'How many teams make the NFL playoffs?',
    a: 'Fourteen, since the 2020 season: four division winners and three wild cards in each of the AFC and NFC. Only the top seed in each conference gets a first round bye; the other three division winners play in wild card weekend along with the three wild card teams.',
  },
  {
    q: 'When did the NFL playoffs start using a bracket instead of one title game?',
    a: 'In 1967, four NFL division champions began playing two conference championships followed by the NFL title game. The 1970 merger expanded the combined league to eight playoff teams. Before 1967 the usual NFL format sent two winners to its title game, but tied leaders could need an extra playoff.',
  },
  {
    q: 'Did the playoff field always grow?',
    a: 'No. The normal ten-team field expanded to sixteen for the strike-shortened 1982 season, then returned to ten in 1983. The permanent increases came in 1990, to twelve, and 2020, to fourteen. The 2002 realignment changed which teams qualified, replacing one wild-card place per conference with a division-winner place, without changing the twelve-team total.',
  },
  {
    q: 'How does NFL playoff overtime work?',
    a: 'Since 2022, both teams get an opportunity to possess the ball, even after an opening touchdown. That means a chance to possess, not a guaranteed offensive drive: an opening defensive touchdown or safety can end the game. Playoff overtime uses 15-minute periods and continues until there is a winner. For example, if the opening offense scores a touchdown, its opponent gets a chance to answer.',
  },
];

const NflPlayoffFormatHistory = () => {
  const sourceIds = [...new Set([...NFL_PLAYOFF_PERIODS.flatMap(p => p.sources), ...NFL_OVERTIME.sources])];
  const sources = sourceIds.map(sourceById).filter((s): s is NonNullable<typeof s> => !!s);
  const publishers = new Set(NFL_PLAYOFF_SOURCES.map(s => s.publisher)).size;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="NFL Playoff Format History Since 1933 | DoUKnowBall"
        description="NFL playoff fields since 1933, the 1967 bracket, the 1982 strike exception, first round byes and overtime changes, checked against official histories and rules."
        path="/nfl-playoff-format-history"
      />
      <GameNavbar />
      <main id="dukb-main" tabIndex={-1} className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-foreground">NFL playoff format history</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            How teams qualified for the NFL championship from 1933 onward, plus the major overtime changes. Field sizes count the scheduled NFL bracket, with extra tied-leader playoffs noted separately. Before 1970, they exclude the separate AFL playoffs. Checked on {NFL_PLAYOFF_VERIFIED_ON} against the linked league, team and Hall of Fame sources.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">NFL playoff format timeline at a glance</h2>
          <p className="sm:hidden mb-2 text-xs text-muted-foreground">Swipe sideways to see every column.</p>
          <div tabIndex={0} role="region" aria-label="NFL playoff format timeline" className="overflow-x-auto rounded-xl border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-secondary/50 text-left">
                  <th className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">Seasons</th>
                  <th className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">NFL field</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Qualifying</th>
                </tr>
              </thead>
              <tbody>
                {NFL_PLAYOFF_PERIODS.map(p => (
                  <tr key={p.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{seasonRange(p)}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{`${p.fieldSize} teams`}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{p.qualifying}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">NFL playoff format, season by season</h2>
          <div className="space-y-4">
            {NFL_PLAYOFF_PERIODS.map(p => (
              <article key={p.id} id={p.id} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-base font-bold text-foreground">{seasonRange(p)}: {p.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.qualifying}</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                  {p.notes.map(n => <li key={n}>{n}</li>)}
                </ul>
                <ReferenceSources label={seasonRange(p)} sourceIds={p.sources} sourceById={sourceById} />
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-2">The overtime rule</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{NFL_OVERTIME.text}</p>
          <ReferenceSources label="the overtime rule" sourceIds={NFL_OVERTIME.sources} sourceById={sourceById} />
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-1">What NFL Front Office plays</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The modern fourteen team bracket: seven seeds in each conference, four division winners and three wild cards, with only the #1 seed getting a bye through wild card weekend. Front Office runs the modern league rather than a chosen era, so this is the whole answer rather than a comparison across starts.
          </p>
          <p className="text-xs mt-3">
            <Link to="/front-office" className={LINK}>Run a club through it</Link>
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">NFL playoff format: questions people ask</h2>
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
            The timeline cross-checks the Chicago Bears history with Hall of Fame results and NFL publications. Overtime uses the current rulebook alongside historical league and team explanations. The links beneath each section show which sources support it. {sources.length} sources across {publishers} publishers, last checked {NFL_PLAYOFF_VERIFIED_ON}.
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

export default NflPlayoffFormatHistory;
