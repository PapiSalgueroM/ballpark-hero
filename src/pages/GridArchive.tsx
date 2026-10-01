import { Link } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { GameShell } from '@/components/game/GameShell';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import archive from '@/data/gridArchive.json';

/**
 * Round 354, generalised in Round 358: the franchise grid archives.
 *
 * Past daily boards with the players who actually solve them. Four decisions
 * worth keeping in view when this page is edited:
 *
 * 1. THE DATA IS BAKED, NOT COMPUTED HERE. scripts/genGridArchive.mjs writes
 *    src/data/gridArchive.json as a release step (npm run archive:grids).
 *    "Every day up to yesterday" is a thing derived from a clock, and the
 *    prerenderer strips clock-derived content on purpose, so a live version of
 *    this page would save as a blank. Round 653: for the same reason every
 *    word on this page states only what the data holds (how many boards, from
 *    which date to which), never "the last N" or "today", so it stays true
 *    however old the bake is when someone reads it.
 * 2. THE ANSWERS ARE COMPUTED, NOT COLLECTED. They come from each game's own
 *    playerMatchesCell over the same indexed player data the game validates
 *    guesses against, and (Round 653) each listed name is also typed through
 *    the game's own lookup, byNormalizedName then pickNamesake, before it is
 *    written. Fitting the crossing was not enough: 1,697 college names belong
 *    to two players, the game's map used to keep one of them, and 227 listed
 *    names were refused when typed. The map now holds every namesake and the
 *    generator and scripts/simGridArchive.mjs both resolve names the way the
 *    page does, so this page cannot list a player the game would reject.
 *    Community picks were the obvious source and the wrong one: those tables
 *    hold a few hundred rows in total, so a picks page would be mostly empty.
 * 3. THESE SPORTS, NOT SOCCER OR THE NFL. Those grids draw from a fixed pool
 *    and recycle it, so publishing a board's answers publishes an answer key
 *    for a puzzle that returns. The franchise grids seed each day's board from
 *    its date, so a board belongs to its date and never comes back.
 * 4. IT IS PUBLISHED BECAUSE IT IS OURS. A champion list is on a thousand
 *    other sites and adds nothing by existing here again. These boards and
 *    these answer counts exist nowhere else, which is the whole argument for
 *    the page.
 */
type SportKey = keyof typeof archive.sports;

/* "2026-08-30" to "August 30, 2026", split from the baked string. Never
   through new Date(...).toLocaleDateString: a Date made from an ISO string is
   UTC midnight, and formatting it anywhere west of Greenwich gives the day
   before, so the build and the prerender could disagree about a board's day. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function longDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
}

const GridArchive = ({ sport }: { sport: string }) => {
  const data = (archive.sports as Record<string, typeof archive.sports[SportKey] | undefined>)[sport];
  /* A route mounted without data is a wiring mistake, not a page. */
  if (!data) return <Navigate to="/" replace />;

  const boards = data.boards;
  const newest = boards[0]?.date;
  const oldest = boards[boards.length - 1]?.date;

  return (
    <>
      <PageSeo
        title={`${data.label} Grid Answers: Past Daily Boards | DoUKnowBall`}
        description={`Past ${data.label} grid boards with every valid answer counted. See which players satisfy ${data.crossing}, then play today's grid.`}
        path={`${data.game}/archive`}
      />
      <GameShell
        width="narrow"
        title={`${data.label} Grid Answers: Past Daily Boards`}
        subtitle={`Past boards from ${oldest ? longDate(oldest) : 'the first day'}, with the players who solve each crossing`}
        showReportQuestion
        reportGameType={`${sport}-grid-archive`}
      >
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">
            The {data.label} grid builds a fresh board from each day's date, so no two
            days share a puzzle. These are the {boards.length} boards from{' '}
            {oldest ? longDate(oldest) : ''} to {newest ? longDate(newest) : ''}. Each
            crossing shows how many players in our data satisfy both sides, and
            the rarest few of them by career games played, because naming the
            obvious answer is easy and naming the deep cut is the point.
          </p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            The counts and names come from the same player data the game checks
            your guesses against, so anything listed here would be accepted in
            the game. A board only goes up once its day is over.{' '}
            <Link to={data.game} className="underline hover:text-foreground">
              Play today's {data.label} grid
            </Link>
            .
          </p>

          {boards.map(board => (
            <section key={board.date} className="mt-10">
              <h2 className="text-base font-semibold text-foreground">
                {data.label} grid answers for {longDate(board.date)}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Rows: {board.rows.join(', ')}. Columns: {board.cols.join(', ')}.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-semibold text-muted-foreground">Crossing</th>
                      <th scope="col" className="py-2 pr-3 font-semibold text-muted-foreground">Valid players</th>
                      <th scope="col" className="py-2 font-semibold text-muted-foreground">Rarest answers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.cells.map(cell => (
                      <tr key={`${cell.row}-${cell.col}`} className="border-t border-border align-top">
                        <th scope="row" className="py-2 pr-3 font-medium text-foreground">
                          {cell.row} and {cell.col}
                        </th>
                        <td className="py-2 pr-3 tabular-nums text-muted-foreground">{cell.total}</td>
                        <td className="py-2 text-muted-foreground">{cell.answers.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <section className="mt-12">
            <h2 className="text-base font-semibold text-foreground">Answers for the other grids</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {Object.entries(archive.sports)
                .filter(([key]) => key !== sport)
                .map(([key, other]) => (
                  <li key={key}>
                    <Link to={`${other.game}/archive`} className="text-primary hover:underline">
                      {other.label} grid answers
                    </Link>
                    , {other.boards.length} past boards and their answers.
                  </li>
                ))}
            </ul>
          </section>
        </div>

        <GameNav currentPath={`${data.game}/archive`} />
      </GameShell>
    </>
  );
};

export default GridArchive;
