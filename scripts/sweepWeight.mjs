/**
 * Round 210: what a phone actually has to download.
 *
 * The owner plays this on a phone, often not on wifi, and nothing was
 * measuring what that costs. It turned out every game page was fetching
 * every word of prose on the site plus a screenshot library nobody had
 * pressed, and the numbers were only visible if you went looking.
 *
 * So this measures them, per route, the way a phone experiences it: open
 * the page, collect every JavaScript file it actually requests, and add up
 * their GZIPPED size, which is what goes over the wire. Then hold each
 * route to a budget.
 *
 * The budgets are the measured numbers with about a fifth of headroom, so
 * ordinary growth does not trip them and a regression of the size Round
 * 210 removed does. They are a ratchet, not a target: if a round makes a
 * page lighter, lower the number here in the same round so the win cannot
 * be silently given back.
 *
 * Measured before Round 210 / after, gzipped JS:
 *   /                 201K / 201K   (the shell, on every page)
 *   /club-manager     661K / 530K
 *   /soccer-career    776K / 649K
 *   /stadium-tycoon   320K / 240K
 *   /minefield        369K / 236K
 *   /nfl-my-career    462K / 330K
 *   /front-office     388K / 256K
 *
 * ROUND 672: FIVE ROUTES 5K TO 15K OVER, AND WHAT GREW, NAMED BEFORE ANYTHING
 * WAS CUT. Measured 2026-09-28 the way this harness measures, a build of
 * main (3e9d0210) against a build of f66bab76 (2026-09-15, the last commit
 * that touched this file):
 *
 *   every game page  +9.1K  the seoMeta chunk: Round 642's 127 search titles
 *                           and descriptions, loaded whole to read one entry
 *                    -5.0K  the entry chunk (Round 659 moved the polls, the
 *                           search engine and the flags out and put the new
 *                           home front in)
 *   /club-manager   +10.5K  its engine chunk: clubManager.ts (+33K of source,
 *                           Round 619's free agents and contract termination
 *                           and what followed), the 2025-26 final tables
 *                           (+15K) and Round 633's season score (+5K)
 *   soccer2 guides   +5.4K  on /soccer-grid, /footle and /soccer-career
 *   football guides  +3.4K  on /nfl-my-career and /front-office
 *
 * THE CUT. The entry chunk every page downloads was carrying all six sport
 * hubs' prose (src/lib/sportHub.ts, about 47K of text: why here, start here,
 * reference, FAQs, about) because the footer and the home page imported
 * SPORT_HUBS for three fields. They read src/lib/sportHubNav.ts now (simHubs
 * holds the two lists equal) and every route measured exactly 14.6K lighter:
 * /club-manager 634.5 to 619.9, /stadium-tycoon 295.1 to 280.5,
 * /wonderkid-factory 275.1 to 260.5, /nfl-my-career 407.6 to 393.0,
 * /soccer-grid 304.6 to 290.0, / 233.3 to 218.7. Three runs, same file
 * counts and the same numbers every time.
 *
 * No budget was raised. The five routes that were red spent the win getting
 * back under; every other route had its budget lowered by 14K, so each keeps
 * exactly the headroom it had before and the win cannot be given back.
 * Release F (2026-09-29) raised /club-manager from 620 to 622: Round 670
 * added extra time to the match engine (the thirty minute stretch, the
 * deflator and the tie context), measured at 621K on the release build, and
 * that is the whole of the raise. The seoMeta split below would pay it back
 * several times over and is filed as its own round.
 * /club-manager and /minefield sit on their ceilings (0.1K and 0.2K spare),
 * as /minefield already did. The next cut on the table is seoMeta: every
 * game page downloads all 127 entries to read one, 9.1K gzipped, which a
 * split by sport (the way Round 210 split the guides) would take to about 1K.
 *
 * ROUND 700: THAT CUT, MADE. The seoMeta chunk is 32 parts now, by a hash of
 * the path (scripts/genSeoMetaParts.mjs says why a hash and not a sport), and
 * a game page fetches only the part holding its own entry, 0.3K to 1.0K
 * gzipped instead of the whole 9.3K. Measured 2026-10-01 the way this harness
 * measures, a build of main (d99b58e4) against a build of the branch on the
 * same machine, three runs each, the same file counts every run:
 *
 *   /club-manager      630.4 to 622.3   /footle          325.6 to 317.9
 *   /soccer-career     696.8 to 689.0   /nfl-my-career   402.1 to 393.7
 *   /stadium-tycoon    289.5 to 281.2   /front-office    303.6 to 295.5
 *   /wonderkid-factory 268.4 to 260.3   /soccer-grid     303.9 to 295.7
 *   /minefield         284.3 to 276.0
 *   /                  225.4 to 226.0   /leaderboard     237.0 to 237.5
 *
 * Every game page is 7.7K to 8.4K lighter. The pages with no entry pay 0.5K
 * to 0.6K, the 32 loaders and the part function in the entry chunk (the
 * hashed file names do not compress). Each game route's budget came down by
 * its own saving, so it keeps the headroom it had on main, except where that
 * would leave under 2K over the branch's own figure (/club-manager, which sat
 * on its ceiling, /stadium-tycoon, /minefield and /front-office), where it is
 * that figure plus 2. / and /leaderboard are unchanged: / now sits on its
 * ceiling (226.0 against 226), so the next thing added to the entry chunk
 * has to pay for itself or raise that line in the open.
 *
 * Measured again after merging main (5d1aa2bb, Aussie Rules Manager in the
 * registry), three runs each, identical every run: every game page 7.8K to
 * 8.4K lighter (/club-manager 630.7 to 622.6, /front-office 303.8 to 295.7,
 * /aussie-rules-manager 259.0 to 250.6), / 225.6 to 226.2, /leaderboard
 * 237.1 to 237.7. Every budget below still holds with the headroom it was set
 * for, so none moved.
 *
 * AND AGAIN AFTER RELEASE K (main e289ac66, which raised four budgets for
 * its own growth), a build of main against a build of the merged branch,
 * three runs each, identical every run:
 *
 *   /club-manager      637.4 to 629.1   /footle          329.8 to 322.0
 *   /soccer-career     709.9 to 702.0   /nfl-my-career   403.6 to 395.1
 *   /stadium-tycoon    290.2 to 281.8   /front-office    307.7 to 299.5
 *   /wonderkid-factory 269.1 to 260.9   /soccer-grid     308.0 to 299.7
 *   /minefield         285.1 to 276.8   /deadline-day    663.6 to 655.1
 *   /                  225.9 to 226.6   /leaderboard     237.5 to 238.1
 *
 * Every game page 7.8K to 8.4K lighter again. Every game route's budget, and
 * the home page's, was set afresh from these figures by one rule: the
 * branch's measured figure plus the
 * headroom the route had on main, held between 2K and 4K, rounded up. That
 * is what main's own release raises leave (3K to 4K over the measured
 * figure), and it takes /soccer-career from 736, 26K over main's figure, to
 * 706, so its ceiling is a ceiling again. / is the one that RISES, 226 to
 * 229, in the open: the 32 part loaders and the part function cost the entry
 * chunk 0.6K, main already measured 225.9 on its 226, and 226.6 rounds to 227.
 * /leaderboard pays the same 0.6K and stays at 266.
 *
 * ROUND 832: THE PAST SEASONS LOAD WITH THE SEASON. Every Club Manager era
 * roster (2015-16, 2010-11, 2005-06) shipped inside the engine chunk, so the
 * page carried all three past worlds for a player in today's game. Each is a
 * dynamic import now, fetched when its era is picked or an era save opens.
 * Measured 2026-10-01, a vite build of main (f3b1ea14, Release P in it)
 * against a build of the branch merged with that main, same machine, same
 * hour:
 *
 *   clubManager chunk   764.6K raw 248.1K gz  to  655.4K raw 217.9K gz
 *   era chunks          2015 14.0K, 2010 10.2K, 2005 9.5K gz, on demand
 *   /club-manager       630.9K to 601.3K
 *
 * Every other route measured the same to a tenth of a kilobyte (/wonderkid-
 * factory 260.9 against 261.0, /nfl-my-career 403.2 against 403.3).
 * /club-manager's budget comes down to 604: 601.3 plus the 2.1K headroom it
 * had on main, rounded up. The 29.6K cannot be given back quietly; it is the
 * room the next leagues use. (Before Release P the same pair measured 629K
 * and 599.6K.)
 *
 * ROUND 1042: THE DATA A PAGE NEVER READS IS IN NONE OF THE FILES IT FETCHES.
 * Section 4 reads the files each route asked for in section 1 and looks in
 * them for probes: short strings a data file prints into whatever chunk
 * carries it (scripts/lib/dataProbes.mjs derives them from the source files
 * when this runs, none is typed). /club-manager, /manager-hot-seat and
 * /deadline-day must fetch no file holding a national team pool, a past
 * season's nationalities or squads, or Footle's data; /transfer-path none
 * holding the pools or a past season; /soccer-career still fetches the pools,
 * because it reads them. The section refuses to pass empty: every probe set
 * has to be found somewhere in dist/assets, each past season's in one file
 * and no two seasons in the same file, or it fails with "cannot tell".
 * Negative control, SWEEP_WEIGHT_CONTROL=planted: after the fetch one pools
 * probe, one 2010 nationality probe and one Footle probe are appended IN
 * MEMORY to the text of the largest file only /club-manager fetched (each
 * asserted absent first); section 4 must then report exactly three findings,
 * all for /club-manager. Exit 1 when it does, 2 when it does not.
 * SWEEP_OFFLINE=1 blocks the database host on every context (a builder may
 * not let a walk reach production; the release gate runs it as it always did).
 * Measured 2026-10-07, a vite build of release-al-int (6f99ccdf) against a
 * build of the branch (e437786a), same machine, same hour, three runs each
 * and every run the same to the tenth, the database host blocked:
 *
 *   /club-manager       704.6K to 561.8K   (142.8K less)
 *   /manager-hot-seat   722.9K to 580.1K   (142.8K less)
 *   /deadline-day       733K to 590.2K   (142.8K less)
 *   /transfer-path      440.6K to 367.5K   (73.1K less)
 *   /soccer-career      779.6K to 780.4K   (0.8K MORE: the pools ride in the page's
 *                       own chunk now, with the squad picker, and no longer
 *                       share a compression stream with the tournament engine)
 *   clubManager chunk   886.2K raw 292.1K gz  to  708.5K raw 234.5K gz
 *   nationality chunks  2020 15.7K, 2015 14.5K, 2010 15.0K, 2005 14.8K gz, on demand
 *
 * /club-manager's budget comes down to 564; the three other manager routes get
 * rows of their own (measured plus 3K), so none of it can be given back quietly.
 * Measured again on the round's last tree, the branch merged with
 * release-al-int at 8fe82a4d (faaf358a): the five figures above the same to
 * the tenth, so the budgets stand. The release gate measures the release
 * build once more, and the ceilings follow that figure.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/sweepWeight.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { dataProbes, findProbes } from './lib/dataProbes.mjs';

const { chromium, devices } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** Route, and the ceiling in kilobytes of gzipped JavaScript. */
/* Round 672: the six routes that had room were lowered by 14K, the whole
   part of the 14.6K the hub prose cut took off every route (see the header);
   the other five were over and spent it getting back under. */
const BUDGETS = [
  ['/', 235], /* Release AE: 235K measured; this page changes no code of its own, the shared chunks every route loads grew with Release AE (the error boundary that offers a fresh start for a broken save, Round 958; the result moment for the clue guessers and chains, Round 953) and with the other lane's PR140 and PR141 merged into it; was 233 */ /* Release AD: 233K measured; this page changes no code of its own, the shared chunks every route loads grew with Release AD (the Transfer Path pool aware autocomplete text in PlayerAutocomplete, Round 1010a; the result moment wiring for the comparison games and Perfect Season, Rounds 986 and 954; the profile on a second device, Round 981); was 231 */ /* release R: 230K measured, the About copy the rendered page now keeps (Round 840), in its own lazy chunk that only this page loads; was 229 */ /* Round 700: 226.6K measured, 0.6K of it the seoMeta part loaders in the entry chunk, 225.9K on main; was 226 */
  ['/club-manager', 564], /* Round 1042: 561.8K measured 2026-10-07 on the branch (e437786a), 704.6K on release-al-int at 6f99ccdf, same machine, same hour, three runs each, the database host blocked: 142.8K less before the club list can draw. The national team pools and the invented name pools left with Soccer Career's squad picker, the four past seasons' nationalities arrive with their season, and the squad shape no longer drags Squad Deal's loader and Footle's data in. 2K headroom: the route had none (its 702 was measured on main at Release AI, and the ten rounds of Release AL put the base at 704.6). The words "load the world editor screen on demand" further along are stale as well: it has been lazy since Round 964 (ClubManager.tsx, the lazy WorldEditorScreen line); was 702 */ /* Release AI: 702K measured (697 at Release AH); Round 1040 Serie B, Ligue 2 and the Segunda (58 real squads, three rules rows, the second tier pyramids); was 697 */ /* Release AH: 697K measured (691 at Release AF); Round 1035 the A-League Men as league 23 (twelve real squads, its rules row, cup byes), Round 1033 the seven real free agents; was 691 */ /* Release AF: 691K measured (675 at Release AE); Round 1015 the nationality map (720 modern names from one production read plus the 2020-21 world block) and the re-baked rosters, Round 1021 the 2020-21 late start calendar, Round 1028 era European nights; was 675 */ /* Release AE: 675K measured (657 at Release AD); Round 971 the 2020-21 big five (its rules rows, era card and picker words; the era data itself loads on demand), Round 946 and 947 nothing (not mounted), and the shared chunks; was 657 */ /* Release AD: 657K measured (640 at Release AC); Round 902 the 2005-06 Serie A, Bundesliga and Ligue 1 rules rows and era data, Round 965 managers you build and edit (the face and the editor), Rounds 982 and 983 the desk cues and bracket moments; was 641 */ /* Release AC: 640K measured (624 at Release AB); Round 964 the world editor and its screen, Round 979 red card appeals and the decisions desk, Round 901 the 2010-11 Serie A, Bundesliga and Ligue 1 rules rows and club lists. Follow up owed: load the world editor screen on demand, it is only used before kickoff. */ /* Release AB: 624K measured (621 at Release AA); Round 978 international duty. */ /* Release AA: 621K measured (614 before); Round 928 manager slots and its screen, Round 899 the 2015-16 Bundesliga and Ligue 1 rules rows and club lists, Round 942 Club Manager XP delegating to the shared gmXp, Round 963 the coach development fix. */ /* Release V: 612K measured; Liga MX and the namesake repair put 161 more real players in the roster chunk (4,204 to 4,365), 2K headroom as before */ /* Release U: 609K measured; Round 876's re-bake after the 2026 window and Brazil's Serie A put 546 more real players in the roster chunk (3,658 to 4,204), 2K headroom as before */ /* Round 832: 601.3K measured, the three era bakes out of the engine chunk into chunks of their own (engine chunk 248.1K to 217.9K gzipped), 630.9K on main at f3b1ea14 on the same machine; 2.1K headroom as on main; was 633 */ /* Round 700: 629.1K measured with the seoMeta split, 637.4K on main; was 641 */ /* release K: 637K measured, the shootout order (782) and job applications (783) in the engine chunk; was 630 */ /* release H: 628K measured, the ticker's sport filter menu (711) in the entry chunk; release G: 626K with the match centre (714), the squad rows (715) and the double roster fix (742); was 622 */
  ['/soccer-career', 776], /* Release AI: 776K measured (759 at Release AH); Round 1037 the league season ledgers (six leagues, 1990-91 to 2025-26) and their reads, Round 1041 the domestic cup table and its run (about 4K); loading the ledgers, the continental cup and the ratings code on demand is owed and is now the cheaper fix; was 759 */ /* Release AH: 759K measured (752 at Release AF); Round 1032 the Through Ball drill, Round 1023 the international nights card that stays up, Round 1029 the dugout's real league table, Round 1022 the verified records table; was 752 */ /* Release AF: 752K measured (737 at Release AE); Round 1012 the shared club rivalry table and derby days, Round 1024 the verified rival stars, Round 1027 World Cups and continental cups in their year's format, Round 1016 defenders rated on their defending; was 737 */ /* Release AE: 737K measured; no Soccer Career code changed, the shared chunks every route loads grew with Release AE (the error boundary that offers a fresh start for a broken save, Round 958; the result moment for the clue guessers and chains, Round 953) and with the other lane's PR140 and PR141 merged into it; was 735 */ /* Release AD: 735K measured (717 at Release AB); Round 972 the group stage or league phase and the continental cups, Round 985 the debut and legacy moments, Round 1011 the season ratings and their dialog, Round 1013 the 51 club pool; loading the continental cup and ratings code on demand is owed by a later round; was 718 */ /* Release AB: 717K measured (715 at Release AA); Round 973 the academy years report and choice. */ /* Release AA: 715K measured (712 at Release Z); Round 929 a league finish every season and Round 974 the career story screen. */ /* Release Z: 712K measured (707 at Release S); Round 835 lifted the posts, brands, agent and personality into shared modules (careerBrand, careerSocial, careerIdentity) and Round 913 the training ground and its drills, both on this route. */ /* Release S: 707K measured (706 at Release R); the soccer guides chunk it shares with /footle and /soccer-grid grew with the Build Your XI chemistry guide. Round 700: 702.0K measured with the seoMeta split, 709.9K on main; was 736 */
  ['/stadium-tycoon', 287], /* Release AE: 287K measured; no tycoon code changed, the shared chunks every route loads grew with Release AE (the error boundary that offers a fresh start for a broken save, Round 958; the result moment for the clue guessers and chains, Round 953) and with the other lane's PR140 and PR141 merged into it; was 285 */ /* Release AD: 285K measured; no tycoon code changed, the shared chunks every route loads grew with Release AD (the Transfer Path pool aware autocomplete text in PlayerAutocomplete, Round 1010a; the result moment wiring for the comparison games and Perfect Season, Rounds 986 and 954; the profile on a second device, Round 981); was 284 */ /* Round 700: 281.8K measured with the seoMeta split, 290.2K on main; was 290 */
  /* Round 216: the new idle game. Measured 243K on the day it shipped,
     mostly the shared index chunk. */
  ['/wonderkid-factory', 266], /* Release AG: 266K measured; no code of this page changed; the shared chunks every route loads grew with the other lane's Round 1063 (Cage Clash in the game registry and search index) and Round 1026's What's New line; was 265 */ /* Release AE: 265K measured; no academy code changed, the shared chunks every route loads grew with Release AE (the error boundary that offers a fresh start for a broken save, Round 958; the result moment for the clue guessers and chains, Round 953) and with the other lane's PR140 and PR141 merged into it; was 264 */ /* Release AD: 264K measured; no academy code changed, the shared chunks every route loads grew with Release AD (the Transfer Path pool aware autocomplete text in PlayerAutocomplete, Round 1010a; the result moment wiring for the comparison games and Perfect Season, Rounds 986 and 954; the profile on a second device, Round 981); was 263 */ /* Round 700: 260.9K measured with the seoMeta split, 269.1K on main; was 270 */
  ['/minefield', 284], /* Release AG: 284K measured; no code of this page changed; the shared chunks every route loads grew with the other lane's Round 1063 (Cage Clash in the game registry and search index) and Round 1026's What's New line; was 283 */ /* Release AE: 283K measured; no minefield code changed, the shared chunks every route loads grew with Release AE (the error boundary that offers a fresh start for a broken save, Round 958; the result moment for the clue guessers and chains, Round 953) and with the other lane's PR140 and PR141 merged into it; was 281 */ /* Release AD: 281K measured; no minefield code changed, the shared chunks every route loads grew with Release AD (the Transfer Path pool aware autocomplete text in PlayerAutocomplete, Round 1010a; the result moment wiring for the comparison games and Perfect Season, Rounds 986 and 954; the profile on a second device, Round 981); was 280 */ /* Round 700: 276.8K measured with the seoMeta split, 285.1K on main; was 288 */ /* release K: 285K measured, two new games in the registry and the What's New entries in the shared chunks; was 284 */ /* release G: 280K measured; the shared result moment (710), the native share sheet (744) and the hub trail (654) sit in chunks every game loads; was 276 */
  ['/footle', 339], /* Release AI: 339K measured; no Footle code changed, the soccer guides chunk it shares with /soccer-career grew with Round 1041's cup section; was 338 */ /* Release AE: 338K measured; no Footle code changed, the shared chunks every route loads grew with Release AE (the error boundary that offers a fresh start for a broken save, Round 958; the result moment for the clue guessers and chains, Round 953) and with the other lane's PR140 and PR141 merged into it; was 336 */ /* Release AD: 336K measured; this release changes no Footle code: the growth is Codex 1006 (saved Unlimited decks, on main and live since 2026-10-05) and the shared chunks every route loads grew with Release AD (the Transfer Path pool aware autocomplete text in PlayerAutocomplete, Round 1010a; the result moment wiring for the comparison games and Perfect Season, Rounds 986 and 954; the profile on a second device, Round 981); was 331 */ /* Release Z: 330K measured; Codex 995 added saved five puzzle Footle practice runs (already live since 2026-10-03 05:37). */ /* Round 700: 322.0K measured with the seoMeta split, 329.8K on main; was 333 */ /* release K: 330K measured, the same shared chunk growth as /minefield; was 328 */ /* release J: 325K measured after the Round 669 re-bake put 15 more players in the bundled pool (538 to 553); before that 324 at release G on 319K measured; was 316 */
  ['/nfl-my-career', 454], /* Release AJ: 454K measured (450 at Release AI); Round 1039 the retirement talk, the farewell season and the Hall rules the board loads eagerly (the speech, the farewell card and the Hall card are lazy chunks); was 450 */ /* Release AI: 450K measured (447 before); Round 1038 the shared summer deck engine and its cards; was 447 */ /* Release AE: 447K measured (442 at Release AD); the other lane s Career Log season review and Compare seasons (Rounds 1008 and 1060, PR140 and PR141) and the shared chunks; was 442 */ /* Release AD: 442K measured (424 at Release Z); Round 988 lands the four content packs on the shared board with one deck engine (usCareerDeckC.ts and the NFL pack, 36 offseason cards); was 425 */ /* Release Z: 424K measured (409 at Release V); Round 917's third deck of 36 offseason cards (nflCareerLifeC.ts, 13K gzipped) and 18 more inbox messages, plus Codex 905's yearly support helper. The content packs of 918 to 920 will grow their routes the same way: loading the decks lazily belongs to the round that binds them to the one US board (900). */ /* Release V: 409K measured (406 at Release U); Rounds 884 and 886 added the free agency negotiation results and the retirement and save deletion confirmations to the shared US career chunk */ /* release N: 403K measured, the calendar inbox and the rival choices (796); was 398 */ /* Round 700: 395.1K measured with the seoMeta split, 403.6K on main; was 404 */ /* release H: 401K measured; the ticker's sport filter menu (711) and the share sheet (744) sit in the entry chunk every page loads; was 400 */
  ['/front-office', 353], /* Release AF: 353K measured (314 at Release AE); Round 1019 mounts the shared GM desk on the NFL Front Office (staff, re-sign desk with the NFL contract rules, pick ledger, trade packages and the deadline); loading the desk panels on demand is owed by a later round; was 314 */ /* Release AE: 314K measured; no front office code changed, the shared chunks every route loads grew with Release AE (the error boundary that offers a fresh start for a broken save, Round 958; the result moment for the clue guessers and chains, Round 953) and with the other lane's PR140 and PR141 merged into it; was 311 */ /* Release AD: 311K measured; no front office code changed, the shared chunks every route loads grew with Release AD (the Transfer Path pool aware autocomplete text in PlayerAutocomplete, Round 1010a; the result moment wiring for the comparison games and Perfect Season, Rounds 986 and 954; the profile on a second device, Round 981); was 309 */ /* Release Z: 308K measured (307 at Release T); Codex 904's traded draft capital on the NFL front office board. */ /* Release T: 307K measured (306 at Release S and with Round 832 alone); the shared celebration styles gained the gated rise Round 834's speech choices wait behind */ /* release R: 305K measured, the board for a full 53 and the practice squad (Round 828; the roster data is its own chunk, loaded on a team tap); was 304 */ /* Round 700: 299.5K measured with the seoMeta split, 307.7K on main; was 312 */ /* release K: 308K measured, the franchise tag and the depth chart (723); was 304 */ /* release H: 302K measured, the entry chunk's ticker menu (711); was 300 */ /* release G: 299K measured, same shared chunks as above; was 296 */
  ['/soccer-grid', 307], /* Release AH: 307K measured; no soccer grid code changed, the soccer guides chunk it shares with /soccer-career and /footle grew with Round 1032's drill and derby lines; was 306 */ /* Release AE: 306K measured; no soccer grid code changed, the shared chunks every route loads grew with Release AE (the error boundary that offers a fresh start for a broken save, Round 958; the result moment for the clue guessers and chains, Round 953) and with the other lane's PR140 and PR141 merged into it; was 304 */ /* Release AD: 304K measured; no soccer grid code changed, the autocomplete it uses (Round 1010a) and the shared chunks every route loads grew with Release AD (the Transfer Path pool aware autocomplete text in PlayerAutocomplete, Round 1010a; the result moment wiring for the comparison games and Perfect Season, Rounds 986 and 954; the profile on a second device, Round 981); was 302 */ /* Round 700: 299.7K measured with the seoMeta split, 308.0K on main; was 308 */ /* release J: 304K measured; this release changes no soccer grid code, the growth is in the shared chunks every route loads; was 300 */
  ['/leaderboard', 266],
  /* Round 1042: three routes that had no row, so a saving on them could be given back silently.
     Added at the END of the table on purpose (the rows above are edited by other rounds). */
  ['/manager-hot-seat', 584], /* Round 1042: 580.1K measured 2026-10-07 on the branch (e437786a), 722.9K on release-al-int at 6f99ccdf, same machine and hour, three runs each: 142.8K less. A new row: the measured figure plus 3K, rounded up */
  ['/deadline-day', 594], /* Round 1042: 590.2K measured 2026-10-07 on the branch (e437786a), 733K on release-al-int at 6f99ccdf, same machine and hour, three runs each: 142.8K less. A new row: the measured figure plus 3K, rounded up */
  ['/transfer-path', 371], /* Round 1042: 367.5K measured 2026-10-07 on the branch (e437786a), 440.6K on release-al-int at 6f99ccdf, same machine and hour, three runs each: 73.1K less. A new row: the measured figure plus 3K, rounded up */
];

const gzCache = new Map();
function gzSize(file) {
  if (gzCache.has(file)) return gzCache.get(file);
  let n = 0;
  try { n = zlib.gzipSync(fs.readFileSync(file)).length; } catch { n = 0; }
  gzCache.set(file, n);
  return n;
}

const browser = await chromium.launch();

console.log('1) Every page is inside its download budget');
const measured = [];
/* Round 1042: the files each route asked for, kept for section 4. */
const fetched = new Map();
for (const [route, budget] of BUDGETS) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  if (process.env.SWEEP_OFFLINE === '1') await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const files = new Set();
  page.on('request', req => {
    const m = req.url().match(/\/assets\/([^?]+\.js)$/);
    if (m) files.add(m[1]);
  });
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 25000 });
    await page.waitForTimeout(1500);
  } catch (e) {
    fail(`${route}: would not load (${String(e).split('\n')[0].slice(0, 80)})`);
    await ctx.close();
    continue;
  }
  let total = 0;
  for (const f of files) total += gzSize(path.join(ROOT, 'dist/assets', f));
  const kb = Math.round(total / 1024);
  measured.push({ route, kb, exact: (total / 1024).toFixed(1), budget, files: files.size });
  fetched.set(route, [...files].sort());
  if (kb > budget) fail(`${route}: ${kb}K of gzipped JavaScript against a budget of ${budget}K`);
  /* A budget nobody is near is a budget nobody is keeping. If a page comes
     in under half its ceiling the ceiling is stale and should come down. */
  if (kb > 0 && kb < budget * 0.5) {
    fail(`${route}: ${kb}K against a ${budget}K budget, so the budget is stale and should be lowered in this round`);
  }
  await ctx.close();
}
for (const m of measured) {
  console.log(`   ${m.route.padEnd(18)} ${String(m.kb).padStart(4)}K gz over ${String(m.files).padStart(3)} files (budget ${m.budget}K, ${m.exact}K to the tenth)`);
}

console.log('2) The two things Round 210 moved off the critical path stay off it');
{
  /* The screenshot library: 47K gzipped, on every game page, for one
     button most players never press. */
  const share = fs.readFileSync(path.join(ROOT, 'src/components/game/ShareButtons.tsx'), 'utf-8');
  if (/^import html2canvas/m.test(share)) fail('html2canvas is back on the critical path of every game page');
  if (!/await import\('html2canvas'\)/.test(share)) fail('html2canvas is no longer loaded on demand');

  /* The guides: 101K gzipped of prose for every game on the site, on every
     game page, when one entry was wanted. */
  const seo = fs.readFileSync(path.join(ROOT, 'src/components/seo/GameSeoContent.tsx'), 'utf-8');
  if (/from '@\/data\/gameContent'/.test(seo)) fail('the guide block imports the merged content map again');
  if (!/loadGameContent/.test(seo)) fail('the guide block no longer loads its sport file on demand');
  /* Nothing else may pull the merged map in either, or the split is undone
     from somewhere else in the tree. */
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name) && !p.includes('gameContent')) {
        const t = fs.readFileSync(p, 'utf-8');
        if (/from '@\/data\/gameContent'/.test(t) || /from '\.\.\/data\/gameContent'/.test(t)) {
          fail(`${path.relative(ROOT, p)} imports the merged content map, which puts every sport back on every page`);
        }
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  console.log('   the screenshot library and the merged guide map are both off the critical path');
}

console.log('3) Every guide is still reachable, one sport at a time');
{
  /* The map from route to sport file is generated, so the risk is that it
     falls behind: a new game whose guide is unreachable would render the
     fallback copy and nobody would notice. This reconciles it against the
     sport files themselves. */
  const dir = path.join(ROOT, 'src/data/gameContent');
  const loader = fs.readFileSync(path.join(dir, 'loader.ts'), 'utf-8');
  const mapped = new Map();
  for (const m of loader.matchAll(/^\s*'([^']+)': '([a-zA-Z0-9]+)',$/gm)) mapped.set(m[1], m[2]);
  const BUNDLES = ['soccer1', 'soccer2', 'football', 'college', 'basketball', 'baseball', 'hockey', 'moreSports', 'world', 'clubManagement', 'stadiumManagement', 'academyManagement', 'aussieRulesManagement'];
  let keys = 0;
  for (const b of BUNDLES) {
    const src = fs.readFileSync(path.join(dir, `${b}.ts`), 'utf-8');
    /* Top level keys of the record: a route path in quotes at the start of
       a line with two spaces of indent. */
    for (const m of src.matchAll(/^ {2}'(\/[a-z0-9-]+)':/gm)) {
      keys += 1;
      const got = mapped.get(m[1]);
      if (!got) fail(`${m[1]} has a guide in ${b}.ts and no entry in loader.ts, so the page shows fallback copy`);
      else if (got !== b) fail(`${m[1]} lives in ${b}.ts but loader.ts sends it to ${got}`);
    }
  }
  if (keys < 90) fail(`only ${keys} guides found across the sport files, the reconciliation is not reading them`);
  for (const [p, b] of mapped) {
    if (!BUNDLES.includes(b)) fail(`loader.ts points ${p} at an unknown bundle ${b}`);
  }
  console.log(`   ${keys} guides across ${BUNDLES.length} sport files, every one of them routed`);
}

console.log('4) The data these pages never read is in none of the files they fetch');
{
  /* Round 1042. A probe is a short string a data file prints into the chunk that carries it,
     derived from the source when this runs (scripts/lib/dataProbes.mjs). */
  const probes = dataProbes(ROOT);
  const ASSETS = path.join(ROOT, 'dist/assets');
  const textCache = new Map();
  const textOf = f => {
    if (!textCache.has(f)) { let t = ''; try { t = fs.readFileSync(path.join(ASSETS, f), 'utf-8'); } catch { t = ''; } textCache.set(f, t); }
    return textCache.get(f);
  };
  const eraIds = Object.keys(probes.eras);
  const sets = [['the national team pools', probes.pools, 'pools'], ["Footle's data", probes.footle, 'footle']];
  for (const id of eraIds) sets.push([`the ${id} nationalities`, probes.eras[id], `nat-${id}`]);
  for (const id of eraIds) sets.push([`the ${id} squads`, probes.eraSquads[id], `squads-${id}`]);

  /* Not vacuous: every set is somewhere in the build, each past season's in exactly one file and
     no two seasons' nationalities (or squads) in the same file. Otherwise this cannot tell. */
  let allFiles = [];
  try { allFiles = fs.readdirSync(ASSETS).filter(f => f.endsWith('.js')); } catch { allFiles = []; }
  if (!allFiles.length) fail('section 4 cannot tell: no built files in dist/assets');
  const home = new Map();
  for (const [what, list, key] of sets) {
    const holders = allFiles.filter(f => findProbes(textOf(f), list) > 0);
    const full = holders.filter(f => findProbes(textOf(f), list) === list.length);
    home.set(key, holders);
    if (!holders.length) fail(`section 4 cannot tell: none of the ${list.length} probes for ${what} is in any built file`);
    else if (key !== 'pools' && key !== 'footle' && (holders.length !== 1 || full.length !== 1)) fail(`section 4 cannot tell: the probes for ${what} are spread over ${holders.length} files (${holders.slice(0, 3).join(', ')}), not all in one`);
    else if (!full.length) fail(`section 4 cannot tell: no built file holds all ${list.length} probes for ${what}`);
  }
  for (const kind of ['nat', 'squads']) {
    const seen = new Map();
    for (const id of eraIds) for (const f of home.get(`${kind}-${id}`) ?? []) {
      if (seen.has(f)) fail(`section 4 cannot tell: ${f} holds the ${kind === 'nat' ? 'nationalities' : 'squads'} of both ${seen.get(f)} and ${id}, so a past season does not arrive by itself`);
      seen.set(f, id);
    }
  }

  /* SWEEP_WEIGHT_CONTROL=planted: three probes appended, in memory, to the largest file that
     /club-manager fetched and no other route of this section did. */
  const CONTROL = process.env.SWEEP_WEIGHT_CONTROL ?? '';
  const ENGINE_ROUTES = ['/club-manager', '/manager-hot-seat', '/deadline-day'];
  const WATCHED = [...ENGINE_ROUTES, '/transfer-path', '/soccer-career'];
  if (CONTROL && CONTROL !== 'planted') { console.error(`SWEEP_WEIGHT_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(2); }
  if (CONTROL === 'planted') {
    const mine = fetched.get('/club-manager') ?? [];
    const others = new Set(WATCHED.filter(r => r !== '/club-manager').flatMap(r => fetched.get(r) ?? []));
    const own = mine.filter(f => !others.has(f)).sort((a, b) => gzSize(path.join(ASSETS, b)) - gzSize(path.join(ASSETS, a)));
    if (!own.length) { console.error('control planted cannot run: /club-manager fetched no file of its own'); process.exit(2); }
    const plant = [probes.pools[0], probes.eras.era2010[0], probes.footle[0]];
    for (const pr of plant) if (textOf(own[0]).includes(pr)) { console.error(`control planted cannot run: ${own[0]} already holds ${pr}`); process.exit(2); }
    textCache.set(own[0], textOf(own[0]) + '\n' + plant.join('\n'));
    console.log(`   CONTROL planted: one pools probe, one 2010 nationality probe and one Footle probe appended in memory to ${own[0]}`);
  }

  const found = [];
  const mustNotFetch = (route, keys) => {
    const files = fetched.get(route);
    if (!files) { fail(`section 4 cannot tell: ${route} was not measured in section 1 (it needs a row in BUDGETS)`); return; }
    for (const [what, list, key] of sets) {
      if (!keys(key)) continue;
      for (const f of files) {
        const n = findProbes(textOf(f), list);
        if (n) { found.push({ route, key, file: f }); fail(`${route} fetches ${f}, which holds ${n} of the ${list.length} probes for ${what}: the page downloads data it never reads`); }
      }
    }
  };
  for (const r of ENGINE_ROUTES) mustNotFetch(r, () => true);
  mustNotFetch('/transfer-path', key => key !== 'footle');
  /* The other half: the one page that reads the pools still gets them. The follow up that makes
     them load with the season there will turn this line around on purpose. */
  const sc = fetched.get('/soccer-career') ?? [];
  const scPools = sc.filter(f => findProbes(textOf(f), probes.pools) > 0);
  if (!scPools.length) fail('/soccer-career fetches no file with the national team pools, and it is the page that reads them: either they moved or the probes cannot see them');
  console.log(`   ${sets.length} probe sets (${sets.reduce((n, x) => n + x[1].length, 0)} probes) all found in the build; ${ENGINE_ROUTES.length + 1} routes checked, ${found.length} findings; /soccer-career still fetches the pools (${scPools.join(', ') || 'no file'})`);

  if (CONTROL === 'planted') {
    await browser.close();
    const mineFound = found.filter(f => f.route === '/club-manager');
    const ok = found.length === 3 && mineFound.length === 3 && new Set(mineFound.map(f => f.key)).size === 3;
    console.log(ok ? 'CONTROL planted FIRED: exactly three findings, all for /club-manager, one for each planted probe' : `CONTROL planted DID NOT FIRE as predicted: ${found.length} findings, ${mineFound.length} of them for /club-manager`);
    process.exit(ok ? 1 : 2);
  }
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`sweepWeight: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('sweepWeight: green. Every page is inside its budget, and the budgets came down this round.');
