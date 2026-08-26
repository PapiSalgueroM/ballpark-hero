/**
 * The College Games Hub.
 *
 * ROUND 268 REWROTE THIS BECAUSE IT WAS EMPTY ON THE LIVE SITE. The page
 * filtered the game registry for two category titles, 'College Football' and
 * 'College Basketball', and neither has ever existed: the registry calls the
 * category 'College Sports'. So the filter matched nothing, the page rendered
 * the sentence "All 0 college football and college basketball games in one
 * place", and under it there was nothing at all. It was in the sitemap, and
 * Round 266 had just added it to the footer of all 122 crawlable documents,
 * which means every page on the site was voting for a page that delivered
 * zero. That is a textbook "crawled, currently not indexed".
 *
 * Two things now stop it coming back. The registry's category titles are a
 * union type and the lookup takes that type, so filtering for a title that
 * does not exist is a compile error rather than an empty array. And
 * scripts/simHubs.mjs reads the SHIPPED document and insists every game the
 * hub claims to gather is actually linked in it, which is the check that would
 * have caught this one: the old link harness counted a page's outbound links
 * across the whole document, where the navbar and footer clear its floor twice
 * over on a page with an empty body.
 *
 * On numbers in the copy. Every count here is computed from the registry this
 * file imports, never typed in by hand. Round 260 shipped two hand-typed
 * counts to the home page that were wrong the day they went live, and the fix
 * was the same one: if the page renders it, the page derives it.
 */
import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { categoriesByTitle, type GameDef } from '@/data/gameRegistry';

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

const CollegeHub = () => {
  /* Typed lookup: 'College Sports' is a CategoryTitle, and anything that is
     not one will not compile. See the header comment. */
  const games = categoriesByTitle('College Sports').flatMap(c => c.games);

  /* Split by what the registry already knows about each game rather than by a
     hand written list, so a new college game lands in the right group on its
     own. Deep sims are the ones the home page showcases; the rest are the
     short ones, with the daily puzzles named first because that is the reason
     to come back. */
  const sims = games.filter(g => g.featured);
  const quick = games.filter(g => !g.featured).sort((a, b) => Number(!!b.daily) - Number(!!a.daily));
  const dailyCount = games.filter(g => g.daily).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="College Sports Games: CFB and CBB Trivia and Sims | DoUKnowBall"
        description={`Every college sports game on DoUKnowBall in one place: ${games.length} free college football and college basketball grids, program guessers and full dynasty sims. No sign-up.`}
        path="/college"
      />
      <GameNavbar />
      <main id="dukb-main" className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground">🎓 College Games Hub</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            All {games.length} college football and college basketball games in one place.{' '}
            {dailyCount} of them reset every day, and every one of them is free with no sign-up.
          </p>
        </header>

        {sims.length > 0 && (
          <section className="mb-10">
            <h2 className="flex items-baseline gap-2 text-lg font-display font-bold text-foreground mb-1">
              🏟️ Run a program
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              The long ones. You take a real school and live with the consequences for as many
              seasons as you last. Recruits and transfers are generated rather than real teenagers,
              which is deliberate: no invented player on this site is allowed to carry a real
              person&apos;s name.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sims.map(g => <GameCard key={g.path} game={g} />)}
            </div>
          </section>
        )}

        {quick.length > 0 && (
          <section className="mb-10">
            <h2 className="flex items-baseline gap-2 text-lg font-display font-bold text-foreground mb-1">
              ⏱️ Five minute college puzzles
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Grids, program guessers and stat calls. Short enough for a queue, and the daily ones
              give everybody the same board so you can argue about it afterwards.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quick.map(g => <GameCard key={g.path} game={g} />)}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card/50 p-4">
          <h2 className="font-display font-bold text-foreground mb-2">Where else to go</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>
              <Link to="/records" className="text-primary hover:underline">Record Books</Link>{' '}
              carries the audited champion tables, including every NCAA final with its runner-up
              and score.
            </li>
            <li>
              <Link to="/leaderboard" className="text-primary hover:underline">World Leaderboard</Link>{' '}
              runs one table across every game on the site, today and all time, and no account is
              needed to appear on it.
            </li>
            <li>
              <Link to="/" className="text-primary hover:underline">The full game list</Link>{' '}
              has the pro leagues, soccer, motorsport and the rest.
            </li>
          </ul>
        </section>

        <GameSeoContent
          pageHasOwnH1
          title="College Sports Games on DoUKnowBall"
          description="This hub gathers every college football and college basketball game on the site into one page: 3x3 grids, progressive-clue program guessers, head to head stat calls, and two full program sims that run recruiting, the transfer portal and a postseason bracket across as many seasons as you can survive. Everything here is free to play in a browser, with no account and no download."
          howToPlay={[
            'Short on time: start with the daily puzzles. Everyone gets the same board each day, and a run takes a couple of minutes.',
            'Want something deeper: CFB Dynasty and CBB Dynasty put you in charge of a real program, from recruiting through the postseason, season after season.',
            'Every game explains itself before you play, and the "?" button reopens the rules and a worked example at any point.',
          ]}
        />
      </main>
    </div>
  );
};

export default CollegeHub;
