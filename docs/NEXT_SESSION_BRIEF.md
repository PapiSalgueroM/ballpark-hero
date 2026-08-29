# DoUKnowBall: Empire Brief (written Aug 12, 2026, end of the all-nighter session)

Read this at the start of the next session. Full history also lives in Claude's memory and in docs/OWNER_REVIEW_2026-08-12.md in the repo. Anthony has granted full standing autonomy: make every call, ship constantly, ask only about money, deletions of things he likes, or brand changes.

## How to start the next session
Anthony says "work on the site" (or anything like it). Claude then, in order:
1. Verify Round 47 actually reached douknowball.com: fetch /sitemap.xml, confirm it says "on 2026-08-12" and has 122 urls. If stale, open the Lovable editor in his Chrome (he stays logged in) and click Publish then Publish changes. deploy_project alone was not flipping publishes while preview builds or security scans were running. Project id c29d224f-a662-4a15-b809-d86fa3b3f0ad.
2. Start Job 1 below. Do not re-ask questions this brief already answers.

## What is LIVE on douknowball.com right now (all verified except where noted)
- Round 43: full login overhaul. Instant signup (email confirmation OFF in Supabase), working Google sign-in (tested end to end), Forgot password + /reset-password page, social buttons hidden unless configured (src/lib/authProviders.ts flags, google true / apple false), profile stats are Games Today + Days in a Row, UpdateNudge tells stale-cache visitors to refresh.
- Round 44: the games batch. My Career and Front Office GM for all four sports, Conquest NHL + MLB, CFB and CBB Dynasty, Soccer Career story upgrades, Club Manager real leagues, Budget Builder v2, darts fix, 106+ games total.
- Round 45: poll bars include your own vote instantly, home scroll position holds while sections load, all 387 em dashes purged from site copy, Missing XI audited clean (167 lineups).
- Round 46: Report a bug button in the footer of every page. Reports relay to douknowball1@gmail.com with the page path attached.
- Round 47: regenerated sitemap.xml, 122 URLs. Pushed to GitHub; publish flip was still propagating when the session ended (check step 1 above).

## The ship pipeline (works, use it exactly like this)
1. Clone github.com/PapiSalgueroM/ballpark-hero (public) in the cloud, edit there, run node_modules/.bin/tsc --noEmit AND npm run build (a regex char class broke a build once after a blind text sweep; tsc alone missed it).
2. Zip changed files with paths, write a COMMIT_ROUNDxx.bat modeled on the previous ones (checkout -- . first, tar -xf zip, optional tsc, git add explicit list, commit, pull --rebase, push, pause). Convert bat to CRLF.
3. SendUserFile both, then device_commit_files into C:\Users\antho\ballpark-hero.
4. Run the bat via computer use: request File Explorer access (comes as click-only tier now; he approves the popup fast). Explorer opens sorted by date modified, so after clicking refresh the new bat is the top row. Double click it. Verify with git ls-remote origin main from the cloud clone.
5. Wait about 2 min for Lovable sync, call deploy_project, and if the live bundle hash has not changed in 5 to 10 min, use his Chrome: Lovable editor, Publish, Publish changes. Verify by fetching / with cache no-store and comparing assets/index-HASH.js.
6. The stop hook complains about "uncommitted changes" in the cloud clone afterward: they are working copies of already-pushed commits. git fetch, confirm zero diff vs origin/main, reset hard, done. Never push from the cloud (no credentials, and the real commits come from his machine).

## Job 1, next session: the AdSense content build (his money path)
AdSense rejected douknowball.com for Low value content (account pub-2929318086316376, ownership verified). Root cause confirmed: ~100 game pages each expose only a title plus 1-2 sentences (GameSeoContent renders title + description only), so Google indexed just 41 of 108 pages.
Build, in one or two overnight rounds:
1. Expand GameSeoContent (src/components/seo/GameSeoContent.tsx) into a real content block: per game, 200-400 words of unique text: how to play, rules, an example walkthrough, strategy tips, 2-3 FAQ entries. Write like a human, casual, ZERO em dashes. Store content in a data file keyed by game path. Cover every game in src/data/gameRegistry.ts. Deepest content for the search winners: college-grid (the college football immaculate grid cluster is his best search product), conquest (580 impressions, only 8 clicks, page 2 ranking), football-grid, nba-connections, soccer-career.
2. About page and Contact page (contact email douknowball1@gmail.com), linked in the Footer next to Privacy and Terms. Add routes in App.tsx.
3. What's New page summarizing recent rounds in plain language, also footer-linked.
4. Ship it, give Google about a week to recrawl, THEN tell Anthony to check "I confirm I have fixed the issues" and click Request review in AdSense. He must NOT click it before the content is live and crawled. After approval, place ad units (the consent-gated loader in index.html is already correct, ads.txt is live and correct).
5. Also worth doing in Search Console together (his Chrome): submit the new sitemap, check the 67 not-indexed pages report.

## Job 2: Soccer Career, the flagship (his #1 game, 14.4k of 22.5k visitors)
Make it a full BitLife-style sports life sim, "way more outta pocket" and much deeper: life choices off the pitch, personalities, drama, wild random events, agents, endorsements, injuries, relationships, retirement arcs, legacy. He wants hours of depth and animations where possible. src/lib/soccerCareerEngine.ts is the engine. This is a multi-round project; ship improvements incrementally, not one giant drop.

## Job 3 and beyond (full detail in docs/OWNER_REVIEW_2026-08-12.md)
- Rebuild Challenge to full Box2Box rules (budgets by club size, coach hire tiers, management cards tied to club identity with penalties, flip-one-of-10 financial cards, commit keep/sell before seeing options, bidding wars vs 2 AI rivals, full season sim). Research Box2Box YouTube formats first.
- Sign the Player: show the bidding play by play; Player Stock Market: hide the player's name, invest off stats only; Squad Deal: managers, jerseys, atmosphere extras, better banker.
- Cross-cutting UX rule he repeats: after any click, the result must appear in view without scrolling. Sweep the multi-step games for this.
- Manager games (Club Manager, Front Office) toward FIFA and FM depth: real tables, UCL mode, facilities.
- Conquest expansion for all sports, more animations everywhere, unique new game concepts only (nothing generic).
- More puzzles for every content game, dailies must differ from unlimited, data correctness above everything ("verify every player that can be guessed is in every game").
- Golf games buildout. Responsive audit at phone, tablet, desktop widths. Stay a website; PWA later; no native app.

## Operational notes
- Supabase project flawuiqbvjobmkfkauhw. DB was at 102% of the free 0.5GB; freed to 447MB (89%) by dropping stale July bak tables. Watch size; next trims are big data tables, or the $25/mo Pro plan when revenue justifies.
- 45 users who were stuck unconfirmed were manually confirmed; new signups need no email.
- Password reset emails ride Supabase default SMTP (about 2/hour sitewide). Custom SMTP (Resend + GoDaddy DNS) is the fix when reset volume grows.
- His accounts: Google login with anthonysalguero3010@gmail.com works on the site; old account amsalguero10@icloud.com has temp password Ballpark-Temp-2026 (tell him to change it whenever).
- Apple sign-in: code ready behind the apple flag; blocked only on his $99/yr Apple Developer decision.
- Analytics reality check (Aug 12): 22.5k visitors / 90 days and climbing fast, Bing is the top referrer, "douknowball" branded searches are strong, avg 4 min on site. Mediavine/Raptive at 50k sessions/month is the milestone after AdSense.

## Anthony's standing rules
Casual human tone everywhere, never em dashes. Data correctness before everything. Ship constantly, decide autonomously, use all available usage. Games must be deep and replayable, not two-second gimmicks. Results appear without scrolling. Every game keeps its "?" how-to. He approves computer-access popups quickly and runs bats himself if asked.
