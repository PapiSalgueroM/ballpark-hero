import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import {
  NHL_PLAYOFF_PERIODS, NHL_PLAYOFF_SOURCES, NHL_PLAYOFF_EXCEPTIONS, NHL_PLAYOFF_VERIFIED_ON,
  seasonRange, sourceById,
} from '@/lib/nhlPlayoffFormatHistory';

/**
 * Round 534: the fifth reference explainer, same shape as Round 522's NFL
 * page. Static, no clock, no database: the prerendered snapshot is the whole
 * page. Nothing here imports the NHL Front Office engine; the sentence about
 * what the game plays is written by hand against src/lib/nhlFrontOffice.ts.
 */

const LINK = 'inline-flex items-center min-h-[32px] text-primary hover:underline';

const RELATED = [
  { path: '/nhl-front-office', label: 'NHL Front Office', why: 'run a club through the real divisional bracket, wild cards and all' },
  { path: '/nhl-my-career', label: 'NHL My Career', why: 'chase the Cup from a player\'s seat instead of the office' },
  { path: '/hockey-grid', label: 'NHL Franchise Grid', why: 'the daily 3x3 franchise puzzle' },
  { path: '/records#cup', label: 'The Record Books', why: 'every Stanley Cup final since 1915, with 1919 and 2005 left blank on purpose' },
  { path: '/hockey', label: 'All the hockey games', why: 'the whole section on one page' },
];

const FAQS = [
  {
    q: 'How many teams make the NHL playoffs?',
    a: 'Sixteen, and it has been sixteen since 1979-80 apart from the 24 club return to play in 2020. Since 2013-14 they are the top three in each of the four divisions plus the two best remaining records in each conference as wild cards.',
  },
  {
    q: 'When did the NHL start using wild cards?',
    a: 'The name arrived with the 2013-14 realignment, but the idea is older: from 1977-78 the last four playoff places went to the best remaining records regardless of division, and from 1979-80 to 1980-81 the whole field of sixteen was ranked by record with no regard to divisions at all.',
  },
  {
    q: 'Why do the first two rounds stay inside the division?',
    a: 'Because the league went back to a shape it had already used. From 1981-82 to 1992-93 the top four in each division played each other in the first two rounds, which is where a lot of the famous rivalries were built. The 1993-94 change to conference wide seeding, one through eight, lasted twenty seasons, and the 2013-14 format brought the divisional rounds back with wild cards attached.',
  },
  {
    q: 'Why was no Stanley Cup awarded in 1919 or 2005?',
    a: 'Different reasons, same result. The 1919 Final between Montreal and Seattle was cancelled after five games because of the influenza epidemic. The whole 2004-05 season was lost to a lockout, so there were no playoffs to award it from. The Record Books leave both years empty rather than filling them.',
  },
  {
    q: 'Has the playoff field ever got smaller?',
    a: 'Once by design. When the league dropped to six clubs in 1942-43, the six qualifiers out of seven became four out of six. Every change since has either kept the field or grown it, and it settled at sixteen in 1979-80.',
  },
];

const NhlPlayoffFormatHistory = () => {
  const sourceIds = [...new Set([...NHL_PLAYOFF_PERIODS.flatMap(p => p.sources), ...NHL_PLAYOFF_EXCEPTIONS.flatMap(e => e.sources)])];
  const sources = sourceIds.map(sourceById).filter((s): s is NonNullable<typeof s> => !!s);
  const publishers = new Set(NHL_PLAYOFF_SOURCES.map(s => s.publisher)).size;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="NHL Playoff Format History: Every Change Since 1917-18 | DoUKnowBall"
        description="Every NHL playoff format change since 1917-18, from meeting the West for the Cup to sixteen clubs with wild cards, and the four springs that broke the pattern."
        path="/nhl-playoff-format-history"
      />
      <GameNavbar />
      <main id="dukb-main" tabIndex={-1} className="flex-1 max-w-3xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-foreground">NHL playoff format history</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Every shape the Stanley Cup playoffs have taken since the NHL's first season in 1917-18, and the four springs that broke the pattern. Each was checked against two independent publishers on {NHL_PLAYOFF_VERIFIED_ON}, listed at the bottom. Where a detail only had one reading it was left out rather than guessed, and where the two accounts disagree the disagreement is printed.
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
                {NHL_PLAYOFF_PERIODS.map(p => (
                  <tr key={p.id} className="border-t border-border/60 align-top">
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{seasonRange(p)}</td>
                    <td className="px-3 py-1.5 font-medium text-foreground whitespace-nowrap">{p.fieldSize} of {p.leagueSize}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{p.qualifying}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">The field column counts the clubs in the NHL's own playoff against the clubs in the league, both in the first season of each row; the league kept growing inside most of them.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-3">Season by season</h2>
          <div className="space-y-4">
            {NHL_PLAYOFF_PERIODS.map(p => (
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
          <h2 className="text-lg font-display font-bold text-foreground mb-3">The springs that broke the pattern</h2>
          <div className="space-y-4">
            {NHL_PLAYOFF_EXCEPTIONS.map(e => (
              <article key={e.id} id={e.id} className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-base font-bold text-foreground">{e.label}: {e.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{e.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-display font-bold text-foreground mb-1">What NHL Front Office plays</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The real format from 2013-14 onward and nothing else: the top three in each of the four divisions plus two wild cards per conference, the division winner with the better record drawing the lower wild card, the first two rounds inside the division, then a conference final and the Stanley Cup Final, every series best of seven. Front Office runs the modern league on real 2026-27 rosters rather than a chosen era, so there is no older bracket to compare it against.
          </p>
          <p className="text-xs mt-3">
            <Link to="/nhl-front-office" className={LINK}>Run a club through it</Link>
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
            Every change above rests on at least two independent publishers agreeing: Wikipedia's season pages cross-checked against the NHL's own playoff format history, the "History of Stanley Cup Playoff Formats" section of the league's 2025 playoffs information guide, with Sports Illustrated, the Hockey Hall of Fame and two NHL.com news pages behind individual rows. Hockey Reference, Britannica and Last Word on Sports all refused the fetch, and two NHL.com history addresses came back empty or missing, so none of those is cited. {sources.length} sources across {publishers} publishers, last checked {NHL_PLAYOFF_VERIFIED_ON}.
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

export default NhlPlayoffFormatHistory;
