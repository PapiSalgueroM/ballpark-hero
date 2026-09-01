import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import { RECORD_SECTIONS, type RecordRow, type RecordSection } from '@/lib/records';
import recordBooks from '@/data/recordBooks.json';

/**
 * The Record Books (Round 238): the audited champion tables as a public
 * year-by-year reference, each section linking to the games that play on
 * the same history. Data ships from the same verified tables the games
 * read; a blank cell means the record was never scraped, never a guess.
 */

type SectionState =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; rows: RecordRow[] };

function SectionTable({ def, st }: { def: RecordSection; st: SectionState }) {
  const [open, setOpen] = useState(false);
  if (st.state === 'loading') {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }
  if (st.state === 'error') {
    return <p className="text-sm text-muted-foreground py-4">Couldn't load this table right now. Refresh to try again.</p>;
  }
  const rows = open ? st.rows : st.rows.slice(0, 12);
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50 text-left">
              <th className="px-3 py-2 font-semibold text-foreground">{def.yearLabel}</th>
              <th className="px-3 py-2 font-semibold text-foreground">{def.championLabel ?? 'Champion'}</th>
              {def.columns.map(([k, label]) => (
                <th key={k} className="px-3 py-2 font-semibold text-foreground">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.year}-${r.champion}-${i}`} className="border-t border-border/60">
                <td className="px-3 py-1.5 text-muted-foreground">{r.year}</td>
                <td className="px-3 py-1.5 font-medium text-foreground">{r.champion}</td>
                {def.columns.map(([k]) => (
                  <td key={k} className="px-3 py-1.5 text-muted-foreground">{r.extra[k] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {st.rows.length > 12 && (
        <button
          onClick={() => setOpen(o => !o)}
          className="mt-1 inline-flex items-center min-h-[32px] px-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {open ? 'Show fewer' : `Show all ${st.rows.length} ${def.rowNoun ?? 'seasons'}`}
        </button>
      )}
    </>
  );
}

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
        title="The Record Books: Champions by Year in Every Sport | DoUKnowBall"
        description="Every Super Bowl, NBA, World Series, Stanley Cup, WNBA, college football and basketball, English soccer, AFL and NRL champion, year by year, checked against the record."
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
        Every champion, year by year, across twelve competitions and awards. These are the same tables our trivia games run on, checked season by season against the official record before anything was allowed to serve them. Where history is odd we keep it odd: split titles get one row per selector, seasons that were never played are missing on purpose, and stripped titles stay vacant.
      </p>
      {/* Round 251: every control here is a real thumb target. The phone
          sweep finally ran in this sandbox and flagged the whole page at
          15-16px tall, so the nav chips, the show-all buttons and the
          play links all carry a 32px minimum box now. */}
      <nav className="flex flex-wrap gap-x-2 gap-y-1 mb-8 text-xs">
        {RECORD_SECTIONS.map(s => (
          <a key={s.key} href={`#${s.key}`} className="inline-flex items-center min-h-[32px] px-1.5 text-primary hover:underline">{s.emoji} {s.title}</a>
        ))}
      </nav>

      <section className="space-y-10">
        {RECORD_SECTIONS.map(def => (
          <div key={def.key} id={def.key}>
            <h2 className="text-xl font-semibold text-foreground mb-1">{def.emoji} {def.title}</h2>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{def.blurb}</p>
            <SectionTable def={def} st={states[def.key]} />
            {def.note && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{def.note}</p>
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
        ))}
      </section>

      <div className="mt-10 text-sm text-muted-foreground leading-relaxed space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Where this comes from</h2>
        <p>
          Each table was verified against at least two independent sources, and the checks run on every build: winner lists are audited answer by answer, split titles and vacated seasons are pinned so they can never quietly change, and a blank cell means the detail was never verified rather than papered over. Spot something that looks wrong anyway? The Report a bug button below lands straight in our inbox.
        </p>
      </div>

    </div>
  );
};

export default Records;
