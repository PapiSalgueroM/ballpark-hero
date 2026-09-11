import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
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
  { path: '/front-office', label: 'NFL Front Office', why: 'run a club through the real 14 team bracket, first round bye and all' },
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
    a: 'The 1970 season, the first after the AFL and NFL fully merged into two conferences. Before that, from 1933, the league\'s two conferences (later divisions) each sent their winner straight to one championship game with no other postseason games.',
  },
  {
    q: 'Why did the field keep growing?',
    a: 'A wild card was added in 1970 so a strong non-division-winner still had a path in. A second wild card in 1978 came with the regular season growing to 16 games. A third in 1990 followed years of complaints that a good team (multiple 10-6 records) was missing out. The 2002 realignment kept the field at twelve but reshaped the divisions. The third wild card returned in 2020, this time with only the top seed keeping a bye.',
  },
  {
    q: 'How does NFL playoff overtime work?',
    a: 'The current rule, since 2022, guarantees both teams at least one possession in a playoff overtime no matter how the first one ends, unless it ends in a safety. Before that, from 2010, only a first-possession field goal did not end it outright. Before 2010 it was pure sudden death: first score, any kind, wins. That is the rule that decided the famous 1958 NFL Championship Game.',
  },
];

const NflPlayoffFormatHistory = () => {
  const sourceIds = [...new Set([...NFL_PLAYOFF_PERIODS.flatMap(p => p.sources), ...NFL_OVERTIME.sources])];
  const sources = sourceIds.map(sourceById).filter((s): s is NonNullable<typeof s> => !!s);
  const publishers = new Set(NFL_PLAYOFF_SOURCES.map(s => s.publisher)).size;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="NFL Playoff Format History: Every Change Since 1933 | DoUKnowBall"
        description="How the NFL playoffs grew from one championship game to a 14 team bracket: every format change since 1933, the postseason overtime rule's own history, checked against two sources, and what NFL Front Office plays."
        path="/nfl-playoff-format-history"
      />
      <GameNavbar />
      <main id="dukb-main" tabIndex={-1} className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-foreground">NFL playoff format history</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Every shape the NFL postseason has taken since 1933, and the overtime rule's own changes. Each was checked against two independent publishers on {NFL_PLAYOFF_VERIFIED_ON}, listed at the bottom. Where a detail only had one reading it was left out rather than guessed.
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
                {NFL_PLAYOFF_PERIODS.map(p => (
                  <tr key={p.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{seasonRange(p)}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{p.fieldSize === 0 ? 'None' : `${p.fieldSize} teams`}</td>
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
            {NFL_PLAYOFF_PERIODS.map(p => (
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
          <h2 className="text-lg font-display font-bold text-foreground mb-2">The overtime rule</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{NFL_OVERTIME.text}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-1">What NFL Front Office plays</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The real fourteen team format: seven seeds in each conference, four division winners and three wild cards, with only the #1 seed getting a bye through wild card weekend. Front Office runs the modern league rather than a chosen era, so this is the whole answer rather than a comparison across starts.
          </p>
          <p className="text-xs mt-3">
            <Link to="/front-office" className={LINK}>Run a club through it</Link>
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
            Every change above rests on at least two independent publishers agreeing, mostly Wikipedia's own season pages cross-checked against the Chicago Bears' official site history piece or Sportscasting's explainer. {sources.length} sources across {publishers} publishers, last checked {NFL_PLAYOFF_VERIFIED_ON}.
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
