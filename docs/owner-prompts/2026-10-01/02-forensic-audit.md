Perform a forensic audit of the entire DoUKnowBall website and repository.

Do not change code yet.

Your job is to find problems.

Treat the live site as a product that must prove every claim it makes.

AUDIT THE ENTIRE SITE

Inspect:

- homepage
- every sport hub
- every game route
- every career simulator
- every GM simulator
- daily games
- record books
- leaderboard
- search
- about
- contact
- privacy
- terms
- accessibility
- what's new
- error pages
- mobile layouts
- shared navigation
- shared footer
- cookie system
- advertising implementation
- analytics
- authentication
- save systems
- data systems

BUILD A COMPLETE INVENTORY

Create a table internally containing:

URL
Game name
Sport
Game type
Playable
Complete
Data-driven
Daily or evergreen
Mobile tested
Save tested
Major bugs
Dead buttons
Missing functionality
Placeholder content
Duplicate content
Data problems
Console errors
Policy concerns
Indexability concerns

GAME TESTING

Actually play every important game.

Do not simply inspect source code and assume that the game works.

For each game:

Start the game.
Play the intended path.
Try invalid input.
Try unexpected input.
Finish the game.
Restart the game.
Refresh the page.
Return to the game.
Test mobile interaction.
Test keyboard interaction where relevant.

Look for:

- fake buttons
- empty states
- impossible states
- broken scoring
- broken progression
- missing content
- incorrect answers
- incorrect player data
- broken saves
- broken resets
- broken daily logic
- duplicated questions
- repeated players
- impossible scenarios
- unfinished screens
- missing animations
- misleading instructions
- incorrect game descriptions

MARKETING CLAIM AUDIT

Compare every claim on the site with the actual implementation.

Examples:

If a page says "real rosters", verify the roster.
If a page says "full GM simulator", verify the actual GM systems.
If a page says "100+ crossroads", verify that the system contains that many meaningful decisions.
If a page says "verified data", identify how the data is actually verified.
If a page says "every game is complete", test the games.
If a page says "no signup required", verify every game actually works without signup.
If a page says saves are automatic, test saving and recovery.
If a page says a daily board is shared by everyone, verify the board generation logic.

Any unsupported claim must be reported.

ADSENSE READINESS AUDIT

Evaluate every indexable page against Google's current publisher and advertising requirements.

Look specifically for:

- low-value pages
- thin pages
- under-construction pages
- broken pages
- pages with little useful publisher content
- duplicate pages
- misleading navigation
- dead-end pages
- deceptive elements
- intrusive popups
- ads near navigation controls
- ads near play buttons
- ads near game controls
- excessive advertising areas
- pages where ads would dominate the content
- pages where the user could mistake an ad for a game control

Do not solve problems by mass-producing generic articles.
Do not solve problems by automatically adding hundreds of words to every game page.
Do not solve problems by copying the same paragraph onto every page.

The goal is genuine user value.

LEGAL AND TRUST AUDIT

Check:

About
Contact
Privacy
Terms
Accessibility
Trademark language
Data disclosures
Third-party services
Analytics disclosures
Cookie behavior
Advertising disclosures

Look for contradictions between pages.

Do not invent legal conclusions. Report concrete inconsistencies and send them for human review.

TECHNICAL AUDIT

Check:

- broken routes
- console errors
- network errors
- failed API requests
- unhandled promises
- race conditions
- hydration problems
- excessive client-side work
- slow page loads
- large assets
- duplicate data fetching
- bad caching
- unnecessary requests
- accessibility problems
- mobile overflow
- layout problems
- missing metadata
- canonical URL problems
- sitemap problems
- robots problems
- structured data problems

OUTPUT

Create a prioritized report with:

P0 = prevents the site from functioning or creates serious accuracy or trust problems
P1 = major quality problem
P2 = important improvement
P3 = polish

Then identify:

TOP 20 PROBLEMS
TOP 20 DATA PROBLEMS
TOP 20 GAMEPLAY PROBLEMS
TOP 20 ADSENSE READINESS PROBLEMS

DO NOT WRITE CODE.
DO NOT FIX ANYTHING.
Do not tell me the site is good.
Give me evidence.
