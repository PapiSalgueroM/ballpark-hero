/**
 * Round 270: the one page that draws every sport hub.
 *
 * This replaces CollegeHub.tsx, which was the only hub on the site and which
 * Round 268 found had been shipping with zero games on it. Six hubs share this
 * component now, so the next improvement to any of them lands on all six, and
 * the next bug does too, which is the trade the project already made for the
 * four front offices and the four career boards.
 *
 * The copy lives in src/lib/sportHub.ts. The counts do not: every number on
 * this page is computed from the game registry as it renders, because a count
 * typed into prose is a count that goes wrong the next time a game ships. That
 * is not a hypothetical, it is Round 260.
 */
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ALL_GAMES, categoriesByTitle } from '@/data/gameRegistry';
import { hubFor, SPORT_HUBS } from '@/lib/sportHub';
import HubExperience from '@/components/hub/HubExperience';

/* Round 654: a game's path written into a hub's prose ships as that game's
   name, linked. The NBA and College hubs had 33 of these ("/nba-grid,
   /nba-connections, /missing-five ... serve everyone the same board") printed
   to the reader as bare text, a web address where a name should be and no
   link to follow. The name is read from the registry by path rather than typed
   into the copy, so a rename reaches every sentence at once. A path that is
   not a live game is left as written, and simHubs section 7 fails the page for
   it. Only a path standing on its own counts: one inside a longer path, or
   glued to a word, is not a mention. */
function withGameLinks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/\/[a-z0-9-]+/g)) {
    const at = m.index ?? 0;
    const before = at === 0 ? ' ' : text[at - 1];
    const after = text[at + m[0].length] ?? ' ';
    if (!/[\s(]/.test(before) || after === '/') continue;
    const game = ALL_GAMES.find(g => g.path === m[0]);
    if (!game) continue;
    out.push(
      text.slice(last, at),
      <Link key={at} to={game.path} className="text-primary hover:underline">{game.label}</Link>,
    );
    last = at + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

const SportHub = ({ route }: { route: string }) => {
  const hub = hubFor(route);
  /* A route mounted without a definition is a wiring mistake, not a page. Send
     the reader home rather than showing them an empty shell, which is exactly
     what /college did for months. simHubs fails the build long before this can
     reach anyone. */
  if (!hub) return <Navigate to="/" replace />;

  const games = categoriesByTitle(...hub.titles).flatMap(c => c.games);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo title={hub.seoTitle} description={hub.seoDescription} path={hub.route} />
      <GameNavbar />
      <main id="dukb-main" className="flex-1 max-w-6xl mx-auto w-full px-4 pt-4 pb-16">
        <HubExperience key={hub.route} hub={hub} games={games} />

        <div className="mx-auto max-w-4xl">
        {/* ROUND 357: the cornerstone sections. These are what turn a hub from
            an icon grid into a page worth landing on, and they are plain
            semantic HTML on purpose so the prerenderer keeps every word of
            them (it reconstructs bodies from headings, paragraphs, list items,
            table cells and links, and drops everything else). */}
        {hub.whyHere && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-2">
              Every {hub.keyword} game here, and how they differ
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{withGameLinks(hub.whyHere)}</p>
          </section>
        )}

        {hub.startHere && hub.startHere.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-2">Where to start with the {hub.keyword} games</h2>
            <ul className="space-y-3">
              {hub.startHere.map(s => (
                <li key={s.path} className="text-sm text-muted-foreground leading-relaxed">
                  <Link to={s.path} className="font-semibold text-primary hover:underline">{s.label}</Link>
                  {'. '}{withGameLinks(s.why)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {hub.reference && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-2">
              {hub.sport}, the background
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{withGameLinks(hub.reference)}</p>
            {hub.referenceLinks && hub.referenceLinks.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {hub.referenceLinks.map(r => (
                  <li key={r.path}>
                    <Link to={r.path} className="font-semibold text-primary hover:underline">{r.label}</Link>
                    <span className="text-muted-foreground">: {r.why}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {hub.hubFaqs && hub.hubFaqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-3">
              {hub.sport} games: questions people ask
            </h2>
            <div className="space-y-4">
              {hub.hubFaqs.map(f => (
                <div key={f.q}>
                  <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{withGameLinks(f.a)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <HubFooterLinks route={hub.route} />

        <GameSeoContent
          pageHasOwnH1
          title={hub.aboutTitle}
          description={hub.about}
          howToPlay={hub.howToPlay}
        />
        </div>
      </main>
    </div>
  );
};

/** The other hubs, plus the two standing pages worth sending people to. */
function HubFooterLinks({ route }: { route: string }) {
  const others = SPORT_HUBS.filter(h => h.route !== route);
  return (
    <section className="rounded-xl border border-border bg-card/50 p-4">
      <h2 className="font-display font-bold text-foreground mb-2">Other sports</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {others.map(h => (
          <Link
            key={h.route}
            to={h.route}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:border-primary/40"
          >
            <span>{h.emoji}</span>{h.navLabel}
          </Link>
        ))}
      </div>
      <ul className="text-sm text-muted-foreground space-y-1.5">
        <li>
          <Link to="/records" className="text-primary hover:underline">Record Books</Link>{' '}
          holds the audited champion tables behind a lot of these games.
        </li>
        <li>
          <Link to="/leaderboard" className="text-primary hover:underline">World Leaderboard</Link>{' '}
          runs one table across every game on the site, today and all time, and no account is
          needed to appear on it.
        </li>
        <li>
          <Link to="/" className="text-primary hover:underline">The full game list</Link>{' '}
          has motorsport, tennis, golf, combat sports and the rest.
        </li>
      </ul>
    </section>
  );
}

export default SportHub;
