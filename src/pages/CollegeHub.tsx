import { Link } from 'react-router-dom';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { CATEGORIES } from '@/data/gameRegistry';

const COLLEGE_CATEGORY_TITLES = ['College Football', 'College Basketball'];

const CollegeHub = () => {
  const collegeCategories = CATEGORIES.filter((c) => COLLEGE_CATEGORY_TITLES.includes(c.title));
  const totalGames = collegeCategories.reduce((n, c) => n + c.games.length, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageSeo
        title="College Games Hub — CFB & CBB Trivia | DoUKnowBall"
        description="Every DoUKnowBall college sports game in one place: college football and college basketball grids, program guessers, and more."
        path="/college"
      />
      <GameNavbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-6 pb-16">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black text-foreground">🎓 College Games Hub</h1>
          <p className="text-muted-foreground mt-1 max-w-xl mx-auto">
            All {totalGames} college football and college basketball games in one place.
          </p>
        </header>

        <div className="space-y-8">
          {collegeCategories.map((cat) => (
            <section key={cat.title}>
              <h2 className="flex items-center gap-2 text-lg font-display font-bold text-foreground mb-4">
                <span className="text-xl">{cat.emoji}</span>
                {cat.title}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({cat.games.length} {cat.games.length === 1 ? 'game' : 'games'})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.games.map((game) => (
                  <Link
                    key={game.path}
                    to={game.path}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all"
                  >
                    <span className="text-2xl">{game.emoji}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">{game.label}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{game.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <GameSeoContent
          title="College Sports Games on DoUKnowBall"
          description="The College Games Hub gathers every college football and college basketball game on DoUKnowBall into a single entry point — grids, program guessers, and clue games for fans of CFB and CBB."
          howToPlay={[
            'Pick any college football or college basketball game from the hub.',
            'Each game has its own rules, from 3x3 grids to progressive-clue guessers.',
            'Come back daily — most college games have a fresh daily puzzle.',
          ]}
        />
      </main>
      <Footer />
    </div>
  );
};

export default CollegeHub;
