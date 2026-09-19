import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import RecordTable from '@/components/records/RecordTable';
import NotFound from '@/pages/NotFound';
import { FORMAT_PAGES, RECORD_SECTIONS, RECORD_SOURCING, type RecordRow } from '@/lib/records';
import { capFirst, decadesOf, joinNames, leadersOf, spanOf, yearRanges } from '@/lib/recordPages';
import recordBooks from '@/data/recordBooks.json';

/**
 * Round 649: one page per competition in the Record Books, all twelve drawn by
 * this one component from RECORD_SECTIONS plus src/data/recordBooks.json.
 *
 * WHY: /records put twelve tables on one address, so a search for "Super Bowl
 * winners by year" or "Brownlow Medal winners" had nothing on the site whose
 * title, heading and table were about exactly that. Each competition now has
 * its own address with keyword headings at every level: the search phrase as
 * the h1, the year by year list under an h2 with one h3 per decade, and the
 * most titles table under its own h2.
 *
 * EVERY NUMBER AND NAME HERE IS COUNTED FROM THE ROWS at render, in
 * src/lib/recordPages.ts. The only typed words are the section's own labels in
 * src/lib/records.ts. The committed JSON is read directly rather than fetched,
 * for the reason Round 372 wrote down on /records: a crawler has to receive the
 * champions, and the prerenderer leaves every database request hanging on
 * purpose. Nothing reads the clock, so the saved page stays true until the rows
 * change.
 *
 * scripts/simRecordPages.mjs checks the saved pages against the JSON.
 */

const LINK = 'inline-flex items-center min-h-[32px] text-primary hover:underline';
const SITE = 'https://douknowball.com';

const RecordPage = ({ slug }: { slug: string }) => {
  const def = RECORD_SECTIONS.find(s => s.slug === slug);
  const rows: RecordRow[] = def
    ? ((recordBooks.sections as Record<string, RecordRow[] | undefined>)[def.key] ?? [])
    : [];
  const span = spanOf(rows);
  if (!def || !span) return <NotFound />;

  const w = def.words;
  const path = `/records/${def.slug}`;
  const h1 = `${capFirst(w.many)} by year`;
  const label = (def.championLabel ?? 'Champion').toLowerCase();
  const unitFor = (n: number) => (n === 1 ? w.unit[0] : w.unit[1]);
  const isPeople = w.who[0] === 'player';

  const { leaders, once } = leadersOf(rows);
  const top = leaders[0].count;
  const topNames = leaders.filter(l => l.count === top).map(l => l.name);
  const decades = decadesOf(rows);
  const format = def.format ? FORMAT_PAGES.find(f => f.path === def.format?.path) : undefined;
  const others = RECORD_SECTIONS.filter(s => s.key !== def.key);

  const { splitYears, gapYears } = span;
  const oneOrMany = (n: number) => (n === 1 ? 'that season' : 'those seasons');

  return (
    <div id="dukb-main" tabIndex={-1} className="min-h-screen bg-background text-foreground px-4 py-12 max-w-3xl mx-auto">
      <PageSeo title={w.seoTitle} description={w.seoDescription(span.first, span.latest)} path={path} />
      {/* The breadcrumb follows the game pages' pattern in GameSeoContent: its own
          Helmet, mounted once with its final content, so it only ever adds. */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'DoUKnowBall', item: SITE },
            { '@type': 'ListItem', position: 2, name: 'The Record Books', item: `${SITE}/records` },
            { '@type': 'ListItem', position: 3, name: h1, item: `${SITE}${path}` },
          ],
        })}</script>
      </Helmet>
      <Link
        to="/records"
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to the Record Books
      </Link>

      <h1 className="text-3xl font-bold mb-2">{h1}</h1>
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{def.blurb}</p>
      {def.note && <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{def.note}</p>}
      <ul className="text-sm text-muted-foreground mb-8 list-disc pl-5 space-y-1 leading-relaxed">
        <li>
          {span.seasons} seasons listed, {span.first} to {span.latest}.
          {rows.length !== span.seasons && ` That is ${rows.length} ${w.unit[1]} in all, because some seasons have more than one.`}
        </li>
        <li>First {label}: {joinNames(span.firstNames)} ({span.first}).</li>
        <li>Latest {label}: {joinNames(span.latestNames)} ({span.latest}).</li>
        <li>{span.distinct} different {w.who[1]} have won it.</li>
      </ul>

      <section className="space-y-6" aria-labelledby="record-every">
        <h2 id="record-every" className="text-xl font-semibold text-foreground">Every {w.one}, year by year</h2>
        {decades.map(d => (
          <div key={d.start}>
            <h3 className="text-base font-semibold text-foreground mb-2">{capFirst(w.many)} in the {d.start}s</h3>
            <RecordTable def={def} rows={d.rows} />
          </div>
        ))}
      </section>

      <section className="mt-10 space-y-3" aria-labelledby="record-most">
        <h2 id="record-most" className="text-xl font-semibold text-foreground">{w.most}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Out in front: {joinNames(topNames)}, {top} {unitFor(top)}{topNames.length > 1 ? ' each' : ''}.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50 text-left">
                <th className="px-3 py-2 font-semibold text-foreground">{capFirst(w.who[0])}</th>
                <th className="px-3 py-2 font-semibold text-foreground">{capFirst(w.unit[1])}</th>
                <th className="px-3 py-2 font-semibold text-foreground">Years</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map(l => (
                <tr key={l.name} className="border-t border-border/60">
                  <td className="px-3 py-1.5 font-medium text-foreground">{l.name}</td>
                  <td className="px-3 py-1.5 text-foreground">{l.count}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{l.years.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {once > 0 && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {once} more {once === 1 ? `${w.who[0]} has` : `${w.who[1]} have`} won it once.
          </p>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">
          How we counted: each line in the year by year tables is one {w.unit[0]} for the {w.who[0]} named on it
          {isPeople ? '.' : `, under the name it had that season, so a ${w.who[0]} that moved or was renamed counts separately under each name.`}
          {splitYears.length > 0 && ` ${joinNames(splitYears)} ${splitYears.length === 1 ? 'has' : 'have'} more than one line, and every ${w.who[0]} named in ${oneOrMany(splitYears.length)} gets one.`}
          {gapYears.length > 0 && ` Nothing is listed for ${yearRanges(gapYears)}, so nobody gets one for ${oneOrMany(gapYears.length)}.`}
        </p>
      </section>

      <section className="mt-10 space-y-2" aria-labelledby="record-play">
        <h2 id="record-play" className="text-lg font-semibold text-foreground">Play with this history</h2>
        <ul className="text-sm space-y-1">
          {def.play.map(g => (
            <li key={g.path}><Link to={g.path} className={`${LINK} font-semibold`}>{g.label}</Link></li>
          ))}
        </ul>
      </section>

      {def.format && format && (
        <section className="mt-10 space-y-2 text-sm text-muted-foreground leading-relaxed" aria-labelledby="record-format">
          <h2 id="record-format" className="text-lg font-semibold text-foreground">{def.format.heading}</h2>
          <p>
            <Link to={format.path} className={`${LINK} font-semibold`}>{format.label}</Link>
            : {format.blurb}
          </p>
        </section>
      )}

      <section className="mt-10 space-y-3 text-sm text-muted-foreground leading-relaxed" aria-labelledby="record-source">
        <h2 id="record-source" className="text-lg font-semibold text-foreground">Where this comes from</h2>
        <p>{RECORD_SOURCING}</p>
      </section>

      <nav className="mt-10 space-y-2" aria-labelledby="record-more">
        <h2 id="record-more" className="text-lg font-semibold text-foreground">More record books</h2>
        <ul className="text-sm space-y-1">
          {others.map(s => (
            <li key={s.key}><Link to={`/records/${s.slug}`} className={LINK}>{capFirst(s.words.many)} by year</Link></li>
          ))}
          <li><Link to="/records" className={`${LINK} font-semibold`}>All the Record Books on one page</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default RecordPage;
