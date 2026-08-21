import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import { Footer } from '@/components/game/Footer';
import { RECORD_SECTIONS, type RecordRow, type RecordSection } from '@/lib/records';

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
              <th className="px-3 py-2 font-semibold text-foreground">Champion</th>
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
          {open ? 'Show fewer' : `Show all ${st.rows.length} seasons`}
        </button>
      )}
    </>
  );
}

const Records = () => {
  const [states, setStates] = useState<Record<string, SectionState>>(
    () => Object.fromEntries(RECORD_SECTIONS.map(s => [s.key, { state: 'loading' } as SectionState])),
  );

  useEffect(() => {
    let alive = true;
    const watchdog = window.setTimeout(() => {
      if (!alive) return;
      setStates(prev => Object.fromEntries(
        Object.entries(prev).map(([k, v]) => [k, v.state === 'loading' ? { state: 'error' } as SectionState : v]),
      ));
    }, 15000);
    for (const def of RECORD_SECTIONS) {
      def.fetch()
        .then(rows => { if (alive) setStates(p => ({ ...p, [def.key]: { state: 'ready', rows } })); })
        .catch(() => { if (alive) setStates(p => ({ ...p, [def.key]: { state: 'error' } })); });
    }
    return () => { alive = false; window.clearTimeout(watchdog); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
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
        Every champion, year by year, across ten competitions. These are the same tables our trivia games run on, checked season by season against the official record before anything was allowed to serve them. Where history is odd we keep it odd: split titles get one row per selector, seasons that were never played are missing on purpose, and stripped titles stay vacant.
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

      <Footer />
    </div>
  );
};

export default Records;
