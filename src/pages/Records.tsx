import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import RecordTable from '@/components/records/RecordTable';
import { FORMAT_PAGES, RECORD_SECTIONS, RECORD_SOURCING, type RecordRow } from '@/lib/records';
import { firstYearOf, joinNames, leadersOf, recentSeasons, sinceLabel } from '@/lib/recordPages';
import recordBooks from '@/data/recordBooks.json';

/**
 * The Record Books (Round 238): the audited champion tables as a public
 * year-by-year reference, each section linking to the games that play on
 * the same history. Data ships from the same verified tables the games
 * read; a blank cell means the record was never scraped, never a guess.
 *
 * Round 649: this is the index now. Every competition has its own page at
 * /records/<slug> (src/pages/RecordPage.tsx) carrying every season its table
 * holds, so this page keeps each section's heading, blurb, note, play links and
 * latest ten seasons, adds one line naming who leads the count (computed, the
 * blurbs carry no counts), and sends the reader on, instead of holding twelve
 * full tables that would compete with the pages built to answer those searches.
 * Every link and leader line names the first year the table holds, because some
 * tables start after the competition did.
 */

/** Seasons shown per section here; the rest live on the section's own page. */
const RECENT_SEASONS = 10;

type SectionState =
  | { state: 'error' }
  | { state: 'ready'; rows: RecordRow[] };

const Records = () => {
  /* ROUND 372: THE TABLES ARE READ FROM A COMMITTED FILE, NOT FETCHED.
     This page used to fetch all 13 sections on mount and render a spinner until
     they landed. That meant a crawler received 13 headings, 25 lines of prose
     and ZERO champion names: no Yankees, no Patriots, no Celtics, no Lakers, on
     a reference page whose entire value is its champion tables.
     THAT WAS NOT A PRERENDER BUG. prerender.mjs leaves every Supabase request
     hanging on purpose, because "a fulfilled request bakes today's data into a
     file that outlives today". The rule is right and it stays. The mistake was
     treating champion tables as live data: they are historical facts that move
     about once a year, so they belong in a file a build regenerates, exactly
     like src/data/gridArchive.json. scripts/genRecordBooks.mjs writes it by
     calling these same RECORD_SECTIONS fetchers, so there is still only one
     definition of what each section contains.
     It also removes the 13 Supabase queries this page issued on every visit,
     which matters after the Round 370 Disk IO incident. */
  const states: Record<string, SectionState> = Object.fromEntries(
    RECORD_SECTIONS.map(s => {
      const rows = (recordBooks.sections as Record<string, RecordRow[] | undefined>)[s.key];
      return [s.key, rows && rows.length > 0
        ? ({ state: 'ready', rows } as SectionState)
        : ({ state: 'error' } as SectionState)];
    }),
  );

  return (
    <div id="dukb-main" tabIndex={-1} className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo
        title={`The Record Books: Champions by Year in ${RECORD_SECTIONS.length} Competitions | DoUKnowBall`}
        description="Champions by year for the Super Bowl, NBA, World Series, Stanley Cup, WNBA, college football and basketball, English soccer, the AFL and the NRL, all in one place."
        path="/records"
      />
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the games
      </Link>
      <h1 className="text-3xl font-bold mb-2">The Record Books</h1>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        Champions by year for {RECORD_SECTIONS.length} competitions and awards, from the same tables our trivia games run on, checked season by season against the official record before anything was allowed to serve them. Each one shows its latest {RECENT_SEASONS} seasons here, and its own page has every season the table holds, decade by decade. Some tables start later than the competition itself, and every page says the year its list begins. Where history is odd we keep it odd: split titles get one row per selector, seasons that were never played are missing on purpose, and stripped titles stay vacant.
      </p>
      {/* Round 251: every control here is a real thumb target. The phone
          sweep finally ran in this sandbox and flagged the whole page at
          15-16px tall, so the nav chips, the section links and the play
          links all carry a 32px minimum box now (Round 649 swapped the
          show-all buttons for one link per section to its own page). */}
      <nav className="flex flex-wrap gap-x-2 gap-y-1 mb-8 text-xs">
        {RECORD_SECTIONS.map(s => (
          <a key={s.key} href={`#${s.key}`} className="inline-flex items-center min-h-[32px] px-1.5 text-primary hover:underline">{s.emoji} {s.title}</a>
        ))}
      </nav>

      <section className="space-y-10">
        {RECORD_SECTIONS.map(def => {
          const st = states[def.key];
          const first = st.state === 'ready' ? firstYearOf(st.rows) : 0;
          const lead = st.state === 'ready' ? leadersOf(st.rows).leaders : [];
          const top = lead.length ? lead[0].count : 0;
          const topNames = lead.filter(l => l.count === top).map(l => l.name);
          return (
            <div key={def.key} id={def.key}>
              <h2 className="text-xl font-semibold text-foreground mb-1">{def.emoji} {def.title}</h2>
              <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{def.blurb}</p>
              {st.state === 'ready' ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    Most {def.words.unit[1]} under one name since {first}: {joinNames(topNames)}, {top}{topNames.length > 1 ? ' each' : ''}.
                  </p>
                  <RecordTable def={def} rows={recentSeasons(st.rows, RECENT_SEASONS)} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-4">Couldn't load this table right now. Refresh to try again.</p>
              )}
              {def.note && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{def.note}</p>
              )}
              {st.state === 'ready' && (
                <Link
                  to={`/records/${def.slug}`}
                  className="mt-1 inline-flex items-center gap-1 min-h-[32px] px-1 text-sm font-semibold text-primary hover:underline"
                >
                  {sinceLabel(def, first)}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1">
                <span>Play with this history:</span>
                {def.play.map((g, i) => (
                  <span key={g.path} className="inline-flex items-center">
                    {i > 0 && <span className="mr-1">·</span>}
                    <Link to={g.path} className="inline-flex items-center min-h-[32px] px-1 text-primary hover:underline">{g.label}</Link>
                  </span>
                ))}
              </p>
            </div>
          );
        })}
      </section>

      {/* Round 520: the explainers sit beside the tables, because a reader who
          wants to know who won also tends to want to know how. */}
      <div className="mt-10 text-sm text-muted-foreground leading-relaxed space-y-2">
        <h2 className="text-lg font-semibold text-foreground">How the competitions work</h2>
        {FORMAT_PAGES.map(f => (
          <p key={f.path}>
            <Link to={f.path} className="inline-flex items-center min-h-[32px] font-semibold text-primary hover:underline">{f.label}</Link>
            : {f.blurb}
          </p>
        ))}
      </div>
      <div className="mt-10 text-sm text-muted-foreground leading-relaxed space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Where this comes from</h2>
        <p>{RECORD_SOURCING}</p>
      </div>

    </div>
  );
};

export default Records;
