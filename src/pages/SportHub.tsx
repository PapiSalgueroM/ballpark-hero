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
import { Link, Navigate } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { categoriesByTitle, type GameDef } from '@/data/gameRegistry';
import { hubFor } from '@/lib/sportHub';

function GameCard({ game }: { game: GameDef }) {
  return (
    <Link
      to={game.path}
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all"
    >
      <span className="text-2xl shrink-0">{game.emoji}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{game.label}</span>
          {game.daily && (
            <span className="text-[10px] uppercase tracking-wide font-bold text-primary border border-primary/40 rounded px-1.5 py-0.5">
              Daily
            </span>
          )}
        </span>
        <span className="block text-xs text-muted-foreground mt-1">{game.description}</span>
      </span>
    </Link>
  );
}

const SportHub = ({ route }: { route: string }) => {
  const hub = hubFor(route);
  /* A route mounted without a definition is a wiring mistake, not a page. Send
     the reader home rather than showing them an empty shell, which is exactly
     what /college did for months. simHubs fails the build long before this can
     reach anyone. */
  if (!hub) return <Navigate to="/" replace />;

  const games = categoriesByTitle(...hub.titles).flatMap(c => c.games);
  /* Grouped by what the registry already knows, so a new game files itself:
     the ones the home page showcases are the long sims, the rest are short,
     with the dailies first because they are the reason to come back. */
  const deep = games.filter(g => g.featured);
  const quick = games.filter(g => !g.featured).sort((a, b) => Number(!!b.daily) - Number(!!a.daily));
  const dailyCount = games.filter(g => g.daily).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo title={hub.seoTitle} description={hub.seoDescription} path={hub.route} />
      <GameNavbar />
      <main id="dukb-main" className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground">{hub.emoji} {hub.h1}</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            All {games.length} of them in one place.{' '}
            {dailyCount > 0 && <>{dailyCount} reset every day, and </>}
            every one is free with no sign-up. {hub.intro}
          </p>
        </header>

        {hub.deep && deep.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-1">{hub.deep.heading}</h2>
            <p className="text-xs text-muted-foreground mb-4">{hub.deep.blurb}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {deep.map(g => <GameCard key={g.path} game={g} />)}
            </div>
          </section>
        )}

        {quick.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-1">{hub.quick.heading}</h2>
            <p className="text-xs text-muted-foreground mb-4">{hub.quick.blurb}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quick.map(g => <GameCard key={g.path} game={g} />)}
            </div>
          </section>
        )}

        {/* ROUND 357: the cornerstone sections. These are what turn a hub from
            an icon grid into a page worth landing on, and they are plain
            semantic HTML on purpose so the prerenderer keeps every word of
            them (it reconstructs bodies from headings, paragraphs, list items,
            table cells and links, and drops everything else). */}
        {hub.whyHere && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-2">
              What is here, and how it splits up
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{hub.whyHere}</p>
          </section>
        )}

        {hub.startHere && hub.startHere.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-2">Where to start</h2>
            <ul className="space-y-3">
              {hub.startHere.map(s => (
                <li key={s.path} className="text-sm text-muted-foreground leading-relaxed">
                  <Link to={s.path} className="font-semibold text-primary hover:underline">{s.label}</Link>
                  {'. '}{s.why}
                </li>
              ))}
            </ul>
          </section>
        )}

        {hub.reference && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-2">
              {hub.h1.replace(/ Games( Hub)?$/, '')}, the background
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{hub.reference}</p>
          </section>
        )}

        {hub.hubFaqs && hub.hubFaqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-3">Questions people ask</h2>
            <div className="space-y-4">
              {hub.hubFaqs.map(f => (
                <div key={f.q}>
                  <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
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
      </main>
    </div>
  );
};

/** The other hubs, plus the two standing pages worth sending people to. */
function HubFooterLinks({ route }: { route: string }) {
  const others = OTHER_HUBS.filter(h => h.route !== route);
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
            <span>{h.emoji}</span>{h.label}
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

/* Kept as a flat list rather than read back out of SPORT_HUBS so this file
   never imports its own page data twice, and so the labels here can be short
   ("Soccer") where the page headings are long ("Soccer Games"). */
const OTHER_HUBS = [
  { route: '/soccer', emoji: '⚽', label: 'Soccer' },
  { route: '/pro-basketball', emoji: '🏀', label: 'Basketball' },
  { route: '/pro-football', emoji: '🏈', label: 'Football' },
  { route: '/baseball', emoji: '⚾', label: 'Baseball' },
  { route: '/hockey', emoji: '🏒', label: 'Hockey' },
  { route: '/college', emoji: '🎓', label: 'College' },
];

export default SportHub;
