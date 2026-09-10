import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import {
  UCL_FORMAT_PERIODS, UCL_FORMAT_SOURCES, UCL_AWAY_GOALS, UCL_FORMAT_VERIFIED_ON,
  periodFor, seasonRange, sourceById,
  type UclFormatPeriod,
} from '@/lib/uclFormatHistory';
import engineShapes from '@/data/uclEngineShapes.json';

/**
 * Round 520: the first reference explainer. The addendum's line for it is
 * "genuinely useful even if a game did not exist", so the timeline comes
 * first and the game comes second. Every fact in the timeline is read from
 * src/lib/uclFormatHistory.ts, where each one carries its sources, and the
 * "what Club Manager plays" block is read from src/data/uclEngineShapes.json,
 * which scripts/genUclEngineShapes.mjs writes by running the real engine and
 * scripts/simUclFormatHistory.mjs refuses to let go stale. The FAQ's one
 * sentence about the engine is built from that same file rather than typed.
 *
 * The page is static: nothing here reads a clock or the database, so the
 * prerendered snapshot is the whole page and a crawler gets every row.
 */

interface EngineShape {
  era: { id: string; label: string; startYear: number; emoji: string };
  firstKo: 'R16' | 'QF';
  legs: 1 | 2;
  awayGoals: boolean;
  realId: string;
  matchesReal: boolean;
  line: string;
}
const SHAPES: EngineShape[] = (engineShapes as { shapes: EngineShape[] }).shapes;

function stageLine(p: UclFormatPeriod): string {
  if (p.stage === 'knockout') return 'Knockout from the first round';
  if (p.stage === 'leaguePhase') return 'One 36 club league table';
  const groups = `${p.groups} group${p.groups === 1 ? '' : 's'} of four`;
  return p.secondGroupStage ? `${groups}, then a second group stage` : groups;
}

/* One cell per shape, walked across all nine periods by the Round 520
   review: the European Cup's final was one match, and the league phase's
   first knockout round is the play-off, not the round of 16. */
function knockoutLine(p: UclFormatPeriod): string {
  if (p.koLegs === null) return 'Group winners straight to the final';
  if (p.stage === 'knockout') return 'Two legs in every round, then a one match final';
  if (p.stage === 'leaguePhase') return 'Two legs from the play-offs to the semi-finals';
  if (p.koLegs === 1) return 'One off semi-finals at the group winners\' grounds';
  return p.roundOf16 ? 'Two legs from the round of 16 to the semi-finals' : 'Two legged quarter-finals and semi-finals';
}

/* The tap target floor the phone sweep holds every control to. */
const LINK = 'inline-flex items-center min-h-[32px] text-primary hover:underline';

const RELATED = [
  { path: '/club-manager', label: 'Club Manager', why: 'manage a real club through these formats, today or in 2005-06, 2010-11 or 2015-16' },
  { path: '/soccer-career', label: 'Soccer Career', why: 'play the nights rather than pick the team' },
  { path: '/whod-they-beat', label: "Who'd They Beat", why: 'the beaten finalists, year by year' },
  { path: '/champ-or-not', label: 'Champ or Not', why: 'did that club ever win it' },
  { path: '/records', label: 'The Record Books', why: 'every champion in every sport we cover' },
  { path: '/soccer', label: 'All the soccer games', why: 'the whole section on one page' },
];

/* The engine sentence in the FAQ is assembled from the generated shapes, so
   it changes when the game does and never has to be remembered. */
function engineFaqAnswer(): string {
  const standIns = SHAPES.filter(s => !s.matchesReal);
  const real = SHAPES.filter(s => s.matchesReal);
  const realLabels = real.map(s => s.era.label).join(', ');
  const standInText = standIns.map(s => `The ${s.era.label} start is the stand in: ${s.line.replace(/ A stand in: /, ' ').replace(/^Eight/, 'eight')}`).join(' ');
  return `Because the engine does not play the league phase yet, and we would rather say so than pretend. ${standInText} The ${realLabels} starts play the real format of their own seasons.`;
}

const FAQS = [
  {
    q: 'When did the Champions League start?',
    a: 'The competition started in 1955-56 as the European Cup, sixteen invited clubs playing two legged knockout ties with a one match final. The Champions League name arrived in 1992-93, at first only for the group stage, and the shape it named had already been played once, in 1991-92.',
  },
  {
    q: 'When did the group stage begin, and when did it end?',
    a: 'The first group stage was 1991-92: two groups of four whose winners met in the final. Groups grew to four in 1994-95, six in 1997-98 and eight in 1999-2000, with a second group stage from 1999-2000 to 2002-03 and a round of 16 in its place from 2003-04. The last group stage was 2023-24; since 2024-25 there is one league table of 36 clubs.',
  },
  {
    q: 'When did away goals stop counting double?',
    a: 'From 2021-22, in every UEFA club competition. A tie level after two legs now goes to extra time and then penalties. UEFA had used the rule since 1965.',
  },
  {
    q: 'How does the league phase work?',
    a: 'Thirty six clubs sit in one table. Each plays eight different opponents, four at home and four away. The top eight go straight to the round of 16, ninth to 24th play a two legged play-off for the other eight places, and 25th to 36th go out with no Europa League place. From the play-offs to the semi-finals the ties are two legged, and the final is one match.',
  },
  {
    q: 'Why does the modern Club Manager save play groups instead of the league phase?',
    a: engineFaqAnswer(),
  },
];

const ChampionsLeagueFormatHistory = () => {
  const sourceIds = [...new Set([...UCL_FORMAT_PERIODS.flatMap(p => p.sources), ...UCL_AWAY_GOALS.sources])];
  const sources = sourceIds.map(sourceById).filter((s): s is NonNullable<typeof s> => !!s);
  const publishers = new Set(UCL_FORMAT_SOURCES.map(s => s.publisher)).size;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="Champions League Format History: Every Change Since 1955 | DoUKnowBall"
        description="How the European Cup became the Champions League: every format from the two legged knockouts of 1955 to the 36 club league phase, each change checked against two sources, and what Club Manager plays in each era."
        path="/champions-league-format-history"
      />
      <GameNavbar />
      <main id="dukb-main" tabIndex={-1} className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-foreground">Champions League format history</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Every shape the European Cup and the Champions League have taken since 1955, and what each Club Manager start actually plays. Each change of format was checked against two independent publishers on {UCL_FORMAT_VERIFIED_ON}, and the sources are listed at the bottom. Where a detail only had one source it was left out rather than guessed.
          </p>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">The timeline at a glance</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50 text-left">
                  <th className="px-3 py-2 font-semibold text-foreground whitespace-nowrap">Seasons</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Name</th>
                  <th className="px-3 py-2 font-semibold text-foreground">First stage</th>
                  <th className="px-3 py-2 font-semibold text-foreground">Knockout</th>
                </tr>
              </thead>
              <tbody>
                {UCL_FORMAT_PERIODS.map(p => (
                  <tr key={p.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{seasonRange(p)}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground">{p.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{stageLine(p)}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{knockoutLine(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">Season by season</h2>
          <div className="space-y-4">
            {UCL_FORMAT_PERIODS.map(p => (
              <article key={p.id} id={p.id} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-base font-bold text-foreground">
                  {seasonRange(p)}: {p.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{p.name}</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.entrants} {p.path}</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                  {p.notes.map(n => <li key={n}>{n}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-2">The away goals rule</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{UCL_AWAY_GOALS.text}</p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-1">What Club Manager plays</h2>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Generated from the game engine itself. A check recomputes these lines from the engine before every release and fails if they have gone stale, so this block cannot quietly describe a game that has moved on. Where the engine stands in for a format it cannot play yet, it says so.
          </p>
          <div className="space-y-3">
            {SHAPES.map(s => (
              <div key={s.era.id} className="rounded-xl border border-border bg-card p-3">
                <h3 className="text-sm font-bold text-foreground">{s.era.emoji} Starting {s.era.label}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.line}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The real {seasonRange(periodFor(s.era.startYear))} shape: {periodFor(s.era.startYear).title.toLowerCase()}.
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3">
            <Link to="/club-manager" className={LINK}>Pick an era and manage a club through it</Link>
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
            Every change of format above, and the first season of the shape it opened, rests on at least two publishers agreeing: Wikipedia's page for that season against RSSSF's results archive for the same season, which lists every tie with both of its legs, and UEFA's own pages for the 2024 format and the away goals rule. The seasons inside a longer period rest on those same sources saying when the shape changed next. {sources.length} sources across {publishers} publishers, last checked {UCL_FORMAT_VERIFIED_ON}. A season that changes format after that date is a season this page does not describe yet, and it will say so here when it is checked.
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

export default ChampionsLeagueFormatHistory;
