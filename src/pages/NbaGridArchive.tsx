import { Link } from 'react-router-dom';
import { GameShell } from '@/components/game/GameShell';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import archive from '@/data/gridArchive.json';

/**
 * Round 354: the NBA grid archive.
 *
 * Past daily boards with the players who actually solve them. Three decisions
 * worth keeping in view when this page is edited:
 *
 * 1. THE DATA IS BAKED, NOT COMPUTED HERE. scripts/genGridArchive.mjs writes
 *    src/data/gridArchive.json at build time. "The last fourteen days" is a
 *    thing derived from a clock, and the prerenderer strips clock-derived
 *    content on purpose, so a live version of this page would save as a blank.
 *    Baked, it prerenders honestly and its sitemap date moves only when the
 *    content really changes.
 * 2. THE ANSWERS ARE COMPUTED, NOT COLLECTED. They come from the game's own
 *    playerMatchesCell over the same indexed player data the game validates
 *    guesses against, so this page cannot list a player the game would reject.
 *    Community picks were the obvious source and the wrong one: those tables
 *    hold a few hundred rows in total, so a picks page would be mostly empty.
 * 3. THIS SPORT, NOT SOCCER OR THE NFL. Those grids draw from a fixed pool and
 *    recycle it, so publishing a board's answers publishes an answer key for a
 *    puzzle that returns. The franchise grids seed each day's board from its
 *    date, so a board belongs to its date and never comes back.
 */
const NbaGridArchive = () => {
  const boards = archive.boards;
  const first = boards[0]?.date;
  const last = boards[boards.length - 1]?.date;

  return (
    <>
      <PageSeo
        title="NBA Grid Answers: Past Daily Boards | DoUKnowBall"
        description="Past NBA grid boards with every valid answer counted. See which players connect each pair of franchises, then play today's grid."
        path="/nba-grid/archive"
      />
      <GameShell
        width="narrow"
        title="NBA GRID ARCHIVE"
        subtitle={`Past daily boards from ${last} to ${first}, with the players who solve them`}
      >
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every day the NBA grid builds a fresh board from that day's date, so
            no two days share a puzzle. These are the last {boards.length} of
            them. For each crossing you get the number of players in our data
            who satisfy both sides, and the rarest few of them by career games
            played, because naming the obvious answer is easy and naming the
            deep cut is the point.
          </p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            The counts and names come from the same player data the game checks
            your guesses against, so anything listed here would be accepted in
            the game. Today's board is not here, because people are still
            playing it.{' '}
            <Link to="/nba-grid" className="underline hover:text-foreground">
              Play today's NBA grid
            </Link>
            .
          </p>

          {boards.map(board => (
            <section key={board.date} className="mt-10">
              <h2 className="text-base font-semibold text-foreground">
                NBA grid for {board.date}
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
        </div>

        <GameNav currentPath="/nba-grid/archive" sportCategory="Pro Basketball" />
      </GameShell>
    </>
  );
};

export default NbaGridArchive;
